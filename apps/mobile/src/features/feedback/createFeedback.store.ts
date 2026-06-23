import { create } from 'zustand';

export type CreateFeedbackDraft = {
  category: string;
  description: string;
  location: string;
  evidence: string[]; // array of URIs
};

export type CreateFeedbackActions = {
  setCategory: (category: string) => void;
  setDescription: (description: string) => void;
  setLocation: (location: string) => void;
  setEvidence: (evidence: string[]) => void;
  addEvidence: (uri: string) => void;
  removeEvidence: (index: number) => void;
  reset: () => void;
};

export const useCreateFeedbackStore = create<CreateFeedbackDraft & CreateFeedbackActions>()((set) => ({
  category: '',
  description: '',
  location: '',
  evidence: [],
  setCategory: (category: string) => set({ category }),
  setDescription: (description: string) => set({ description }),
  setLocation: (location: string) => set({ location }),
  setEvidence: (evidence: string[]) => set({ evidence }),
  addEvidence: (uri: string) => set((state) => ({ evidence: [...state.evidence, uri] })),
  removeEvidence: (index: number) => set((state) => {
    const newEvidence = [...state.evidence];
    newEvidence.splice(index, 1);
    return { evidence: newEvidence };
  }),
  reset: () => set({ category: '', description: '', location: '', evidence: [] }),
}));