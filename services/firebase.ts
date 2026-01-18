import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, User } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDoc, doc, onSnapshot, updateDoc, arrayUnion, query, where, getDocs } from 'firebase/firestore';
import { QuizQuestion, QuizSettings, Room, Player } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyCGdb8qB8QNfGxUgD-XIcMnebr-G7pB9Ig",
  authDomain: "studio-1339137379-347b9.firebaseapp.com",
  projectId: "studio-1339137379-347b9",
  storageBucket: "studio-1339137379-347b9.firebasestorage.app",
  messagingSenderId: "200108432897",
  appId: "1:200108432897:web:ec04dce14c654862e7ea00"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Helper to authenticate anonymously
const ensureAuth = async (): Promise<User> => {
  try {
    // Wait for the initial auth state to be resolved
    await auth.authStateReady();

    if (!auth.currentUser) {
      const userCredential = await signInAnonymously(auth);
      return userCredential.user;
    }
    
    return auth.currentUser;
  } catch (error) {
    console.error("Auth initialization failed:", error);
    throw new Error("Could not authenticate. Please check your connection.");
  }
};

// --- Challenge Links (Existing) ---

export interface ChallengeData {
  questions: QuizQuestion[];
  settings: QuizSettings;
  createdAt: number;
}

export const createChallenge = async (questions: QuizQuestion[], settings: QuizSettings): Promise<string> => {
  const user = await ensureAuth();
  
  try {
    // Sanitize data to remove undefined values (unsupported by Firestore)
    const cleanQuestions = JSON.parse(JSON.stringify(questions));
    const cleanSettings = JSON.parse(JSON.stringify(settings));
    
    // Flatten data for the document
    const docData = {
      questions: cleanQuestions,
      settings: cleanSettings,
      creatorId: user.uid,
      userId: user.uid,
      uid: user.uid, // Adding 'uid' explicitly as some rules might check for it
      createdAt: Date.now()
    };

    const docRef = await addDoc(collection(db, "challenges"), docData);
    return docRef.id;
  } catch (e) {
    console.error("Error creating challenge: ", e);
    throw new Error("Could not create challenge link. Missing permissions or network error.");
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

// --- Room System (Real-time) ---

const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const createRoom = async (playerName: string, settings: QuizSettings): Promise<{ roomId: string, playerId: string, code: string }> => {
  const user = await ensureAuth();
  try {
    const playerId = `host_${Date.now()}`;
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
      ownerId: user.uid,
      uid: user.uid 
    };

    const docRef = await addDoc(collection(db, "rooms"), roomData);
    return { roomId: docRef.id, playerId, code };
  } catch (e) {
    console.error("Error creating room:", e);
    throw new Error("Failed to create room.");
  }
};

export const joinRoom = async (code: string, playerName: string): Promise<{ roomId: string, playerId: string }> => {
  await ensureAuth();
  try {
    const q = query(collection(db, "rooms"), where("code", "==", code.toUpperCase()), where("status", "==", "waiting"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("Room not found or game already started.");
    }

    const roomDoc = querySnapshot.docs[0];
    const roomId = roomDoc.id;
    const playerId = `p_${Date.now()}`;

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