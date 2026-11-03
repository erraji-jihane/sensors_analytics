import axios from 'axios';

// Production (Vercel) serves the API from the same site, so requests use relative
// URLs. Locally, `npm start` talks to the Express server in server/ on port 3001.
export const API_URL =
  process.env.REACT_APP_API_URL ?? (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');

export type Reading = { temp: number; vib: number; press: number; rpm: number };

export type Prediction = {
  probability: number;
  isFault: boolean;
  message: string;
  z: number[];
  hidden: number[];
  // Features outside the range seen in training; the prediction is meaningless then
  outOfRange: { feature: string; value: number; min: number; max: number }[];
};

export type Neighbor = {
  id: string;
  distance: number;
  fault: number;
  reading: { temperature: number; vibration: number; pressure: number; rpm: number };
  pca: number[];
};

export type SimilarityResult = {
  query: { z: number[]; pca: number[] };
  neighbors: Neighbor[];
  pcaNeighbors: Neighbor[];
  preservation: number;
  k: number;
  knnFaultVotes: number;
  knnIsFault: boolean;
};

export type Overview = {
  trainSize: number;
  testSize: number;
  trainFaultRate: number;
  accuracy: { neuralNetwork: number; knnOriginal: number; knnPca: number; alwaysNoFault: number };
  pcaMap: { id: string; pc1: number; pc2: number; fault: number }[];
};

function errorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const serverError = (e.response?.data as { error?: string } | undefined)?.error;
    if (serverError) return serverError;
    if (!e.response) return `Can't reach the API${API_URL ? ` at ${API_URL}` : ''}. Is it running?`;
  }
  return 'Something went wrong. Please try again.';
}

async function call<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (e) {
    throw new Error(errorMessage(e));
  }
}

export const predict = (r: Reading) => call<Prediction>(axios.post(`${API_URL}/api/predict`, r));
export const similarity = (r: Reading) => call<SimilarityResult>(axios.post(`${API_URL}/api/similarity`, r));
export const overview = () => call<Overview>(axios.get(`${API_URL}/api/overview`));
