
export type CandyType = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

export interface Candy {
  id: string;
  type: CandyType;
  row: number;
  col: number;
  isMatched: boolean;
  isFalling: boolean;
}

export interface Position {
  row: number;
  col: number;
}

export interface GameState {
  board: (Candy | null)[][];
  score: number;
  moves: number;
  level: number;
  selectedCandy: Position | null;
  isProcessing: boolean;
}
