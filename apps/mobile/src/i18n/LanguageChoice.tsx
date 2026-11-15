import { createContext, useContext } from 'react';

/** Whether the member has picked a language yet (first launch). */
export const LanguageChoice = createContext({ chosen: false, markChosen: () => {} });
export const useLanguageChoice = () => useContext(LanguageChoice);
