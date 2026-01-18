import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  updateProfile, 
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDoc, 
  setDoc,
  doc, 
  onSnapshot, 
  updateDoc, 
  arrayUnion, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { QuizQuestion, QuizSettings, Room, Player, UserProfile, MatchRecord, GachaCard } from '../types';
import { getUserStats } from './levelService'; // Fallback for level calc logic

const firebaseConfig = {
  apiKey: "AIzaSyCGdb8qB8QNfGxUgD-XIcMnebr-G7pB9Ig",
  authDomain: "studio-1339137379-347b9.firebaseapp.com",
  projectId: "studio-1339137379-347b9",
  storageBucket: "studio-1339137379-347b9.firebasestorage.app",
  messagingSenderId: "200108432897",
  appId: "1:200108432897:web:ec04dce14c654862e7ea00"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = getFirestore(app);

// --- Auth Functions ---

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    await createUserDocument(result.user);
    return result.user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const registerWithEmail = async (email: string, pass: string, name: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(result.user, { displayName: name });
    await createUserDocument(result.user);
    return result.user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const logout = async () => {
  await firebaseSignOut(auth);
};

// Create User Doc in Firestore if it doesn't exist
const createUserDocument = async (user: User) => {
  if (!user) return;
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    const { email, displayName, photoURL, uid } = user;
    const initialStats = getUserStats(); // Get default Level 0 stats
    
    const newProfile: UserProfile = {
      uid,
      email: email || '',
      displayName: displayName || 'Anime Fan',
      photoURL: photoURL || '',
      xp: 0,
      level: 1,
      title: initialStats.title,
      gamesPlayed: 0,
      achievements: [],
      matchHistory: [],
      inventory: [],
      lastGachaDate: 0
    };

    try {
      await setDoc(userRef, newProfile);
    } catch (e) {
      console.error("Error creating user profile", e);
    }
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, "users", uid);
    const snapshot = await getDoc(userRef);
    if (snapshot.exists()) return snapshot.data() as UserProfile;
    return null;
  } catch (e) {
    return null;
  }
};

export const subscribeToUserProfile = (uid: string, callback: (profile: UserProfile) => void) => {
  return onSnapshot(doc(db, "users", uid), (doc) => {
    if (doc.exists()) {
      callback(doc.data() as UserProfile);
    }
  });
};

export const saveGameResultToProfile = async (uid: string, record: MatchRecord, newAchievements: string[]) => {
  const userRef = doc(db, "users", uid);
  
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;
  
  const currentData = snap.data() as UserProfile;
  const newXp = (currentData.xp || 0) + record.xpEarned;
  
  const newLevel = Math.floor(Math.sqrt(newXp));

  await updateDoc(userRef, {
    xp: newXp,
    level: newLevel,
    gamesPlayed: (currentData.gamesPlayed || 0) + 1,
    matchHistory: arrayUnion(record),
    ...(newAchievements.length > 0 && { achievements: arrayUnion(...newAchievements) })
  });
};

export const saveGachaItem = async (uid: string, item: GachaCard) => {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    inventory: arrayUnion(item),
    lastGachaDate: Date.now()
  });
};


// --- Existing Helpers ---

const ensureAuth = async (): Promise<User> => {
  try {
    await auth.authStateReady();
    if (!auth.currentUser) {
      const userCredential = await signInAnonymously(auth);
      return userCredential.user;
    }
    return auth.currentUser;
  } catch (error) {
    console.error("Auth initialization failed:", error);
    throw new Error("Could not authenticate.");
  }
};

// --- Challenge Links ---

export interface ChallengeData {
  questions: QuizQuestion[];
  settings: QuizSettings;
  createdAt: number;
}

export const createChallenge = async (questions: QuizQuestion[], settings: QuizSettings): Promise<string> => {
  const user = await ensureAuth();
  
  try {
    const cleanQuestions = JSON.parse(JSON.stringify(questions));
    const cleanSettings = JSON.parse(JSON.stringify(settings));
    
    const docData = {
      questions: cleanQuestions,
      settings: cleanSettings,
      creatorId: user.uid,
      createdAt: Date.now()
    };

    const docRef = await addDoc(collection(db, "challenges"), docData);
    return docRef.id;
  } catch (e) {
    console.error("Error creating challenge: ", e);
    throw new Error("Could not create challenge link.");
  }
};

export const getChallenge = async (challengeId: string): Promise<ChallengeData | null> => {
  await ensureAuth();
  try {
    const docRef = doc(db, "challenges", challengeId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as ChallengeData;
    } else {
      return null;
    }
  } catch (e) {
    console.error("Error getting challenge: ", e);
    throw new Error("Could not load challenge.");
  }
};

// --- Room System ---

const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const createRoom = async (playerName: string, settings: QuizSettings): Promise<{ roomId: string, playerId: string, code: string }> => {
  const user = await ensureAuth();
  try {
    const playerId = user.isAnonymous ? `host_${Date.now()}` : user.uid;
    const code = generateRoomCode();
    
    const hostPlayer: Player = {
      id: playerId,
      name: playerName,
      score: 0,
      isHost: true
    };
    
    const cleanSettings = JSON.parse(JSON.stringify(settings));

    const roomData = {
      code,
      hostId: playerId,
      status: 'waiting',
      settings: cleanSettings,
      players: [hostPlayer],
      createdAt: Date.now(),
      ownerId: user.uid
    };

    const docRef = await addDoc(collection(db, "rooms"), roomData);
    return { roomId: docRef.id, playerId, code };
  } catch (e) {
    console.error("Error creating room:", e);
    throw new Error("Failed to create room.");
  }
};

export const joinRoom = async (code: string, playerName: string): Promise<{ roomId: string, playerId: string }> => {
  const user = await ensureAuth();
  try {
    const q = query(collection(db, "rooms"), where("code", "==", code.toUpperCase()), where("status", "==", "waiting"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("Room not found or game already started.");
    }

    const roomDoc = querySnapshot.docs[0];
    const roomId = roomDoc.id;
    const playerId = user.isAnonymous ? `p_${Date.now()}` : user.uid;

    const newPlayer: Player = {
      id: playerId,
      name: playerName,
      score: 0,
      isHost: false
    };

    await updateDoc(doc(db, "rooms", roomId), {
      players: arrayUnion(newPlayer)
    });

    return { roomId, playerId };
  } catch (e: any) {
    console.error("Error joining room:", e);
    throw new Error(e.message || "Failed to join room.");
  }
};

export const listenToRoom = (roomId: string, callback: (room: Room) => void) => {
  return onSnapshot(doc(db, "rooms", roomId), (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as Room);
    }
  });
};

export const startRoomGame = async (roomId: string, questions: QuizQuestion[]) => {
  await ensureAuth();
  try {
    const cleanQuestions = JSON.parse(JSON.stringify(questions));
    await updateDoc(doc(db, "rooms", roomId), {
      status: 'playing',
      questions: cleanQuestions
    });
  } catch (e) {
    console.error("Error starting game:", e);
    throw new Error("Failed to start game.");
  }
};

export const updatePlayerScore = async (roomId: string, players: Player[]) => {
    await ensureAuth();
    await updateDoc(doc(db, "rooms", roomId), {
        players: players
    });
};
