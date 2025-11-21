
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

export type ObjectiveType = 'clear_board' | 'collect_colors';

export interface LevelObjective {
  type: ObjectiveType;
  description: string;
  // For collect_colors objective
  targetColors?: {
    [key in CandyType]?: number;
  };
}

export interface LevelConfig {
  level: number;
  moves: number;
  boardSize: { rows: number; cols: number };
  objective: LevelObjective;
}

export interface GameState {
  board: (Candy | null)[][];
  score: number;
  moves: number;
  level: number;
  selectedCandy: Position | null;
  isProcessing: boolean;
  objective: LevelObjective;
  collectedColors: {
    [key in CandyType]: number;
  };
}
