import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
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
const ensureAuth = async () => {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
};

// --- Challenge Links (Existing) ---

export interface ChallengeData {
  questions: QuizQuestion[];
  settings: QuizSettings;
  createdAt: number;
}

export const createChallenge = async (questions: QuizQuestion[], settings: QuizSettings): Promise<string> => {
  await ensureAuth();
  try {
    const docRef = await addDoc(collection(db, "challenges"), {
      questions,
      settings,
      createdAt: Date.now()
    });
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

// --- Room System (Real-time) ---

const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const createRoom = async (playerName: string, settings: QuizSettings): Promise<{ roomId: string, playerId: string, code: string }> => {
  await ensureAuth();
  try {
    const playerId = `host_${Date.now()}`;
    const code = generateRoomCode();
    
    const hostPlayer: Player = {
      id: playerId,
      name: playerName,
      score: 0,
      isHost: true
    };

    const roomData: Omit<Room, 'id'> = {
      code,
      hostId: playerId,
      status: 'waiting',
      settings,
      players: [hostPlayer],
      createdAt: Date.now()
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
    await updateDoc(doc(db, "rooms", roomId), {
      status: 'playing',
      questions: questions
    });
  } catch (e) {
    console.error("Error starting game:", e);
    throw new Error("Failed to start game.");
  }
};

export const updatePlayerScore = async (roomId: string, players: Player[]) => {
    // In a real app we might update just the specific player field using complex logic, 
    // but replacing the array is simpler for this scope given concurrency isn't high.
    await ensureAuth();
    await updateDoc(doc(db, "rooms", roomId), {
        players: players
    });
};