/// <reference types="vite/client" />

// Web Speech API
declare class SpeechRecognition extends EventTarget {
  continuous: boolean;
  grammars: SpeechGrammarList;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudioend: ((ev: Event) => void) | null;
  onaudiostart: ((ev: Event) => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  onnomatch: ((ev: SpeechRecognitionEvent) => void) | null;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onsoundend: ((ev: Event) => void) | null;
  onsoundstart: ((ev: Event) => void) | null;
  onspeechend: ((ev: Event) => void) | null;
  onspeechstart: ((ev: Event) => void) | null;
  onstart: ((ev: Event) => void) | null;
  abort(): void;
  start(): void;
  stop(): void;
}

declare class SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

declare class SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

declare class SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

declare class SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

declare class SpeechRecognitionAlternative {
  readonly confidence: number;
  readonly transcript: string;
}

declare class SpeechGrammarList {
  readonly length: number;
  addFromURI(src: string, weight?: number): void;
  addFromString(string: string, weight?: number): void;
  item(index: number): SpeechGrammar;
  [index: number]: SpeechGrammar;
}

declare class SpeechGrammar {
  src: string;
  weight: number;
}

interface Window {
  SpeechRecognition: typeof SpeechRecognition;
  webkitSpeechRecognition: typeof SpeechRecognition;
}

declare module 'firebase/firestore';

