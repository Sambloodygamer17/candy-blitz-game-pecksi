
import { Candy, CandyType, Position, LevelConfig, LevelObjective } from '@/types/game';

const CANDY_TYPES: CandyType[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

export const getCandyColor = (type: CandyType): string => {
  const colorMap: Record<CandyType, string> = {
    red: '#E74C3C',
    blue: '#3498DB',
    green: '#2ECC71',
    yellow: '#F1C40F',
    purple: '#9B59B6',
    orange: '#F39C12',
  };
  return colorMap[type];
};

// Calculate board size based on level (1-1000)
export const getBoardSize = (level: number): { rows: number; cols: number } => {
  // Level 1-10: 4x4
  if (level <= 10) {
    return { rows: 4, cols: 4 };
  }
  // Level 11-30: 5x5
  if (level <= 30) {
    return { rows: 5, cols: 5 };
  }
  // Level 31-60: 6x6
  if (level <= 60) {
    return { rows: 6, cols: 6 };
  }
  // Level 61-100: 7x7
  if (level <= 100) {
    return { rows: 7, cols: 7 };
  }
  // Level 101-200: 8x8
  if (level <= 200) {
    return { rows: 8, cols: 8 };
  }
  // Level 201-400: 9x9
  if (level <= 400) {
    return { rows: 9, cols: 9 };
  }
  // Level 401-700: 10x10
  if (level <= 700) {
    return { rows: 10, cols: 10 };
  }
  // Level 701-1000: 11x11
  return { rows: 11, cols: 11 };
};

// Generate level configuration with objectives
export const getLevelConfig = (level: number): LevelConfig => {
  const boardSize = getBoardSize(level);
  const totalCells = boardSize.rows * boardSize.cols;
  
  // Calculate moves based on board size and level
  const baseMoves = Math.floor(totalCells * 1.5);
  const moves = Math.max(15, baseMoves - Math.floor(level / 10));
  
  // Determine objective type based on level
  let objective: LevelObjective;
  
  // Every 5th level has a color collection objective
  if (level % 5 === 0) {
    const numColors = Math.min(2 + Math.floor(level / 20), 4);
    const targetColors: { [key in CandyType]?: number } = {};
    const availableColors = CANDY_TYPES.slice(0, Math.min(4 + Math.floor(level / 10), CANDY_TYPES.length));
    
    // Select random colors for collection
    const selectedColors = availableColors
      .sort(() => Math.random() - 0.5)
      .slice(0, numColors);
    
    selectedColors.forEach(color => {
      targetColors[color] = Math.floor(totalCells * 0.4) + Math.floor(level / 5);
    });
    
    const colorNames = selectedColors.join(', ');
    objective = {
      type: 'collect_colors',
      description: `Collect ${Object.values(targetColors)[0]} of each: ${colorNames}`,
      targetColors,
    };
  } else {
    // Clear board objective
    objective = {
      type: 'clear_board',
      description: 'Clear all candies from the board',
    };
  }
  
  return {
    level,
    moves,
    boardSize,
    objective,
  };
};

export const createCandy = (row: number, col: number, level: number): Candy => {
  const availableTypes = CANDY_TYPES.slice(0, Math.min(4 + Math.floor(level / 10), CANDY_TYPES.length));
  const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
  return {
    id: `${row}-${col}-${Date.now()}-${Math.random()}`,
    type,
    row,
    col,
    isMatched: false,
    isFalling: false,
  };
};

export const createInitialBoard = (rows: number, cols: number, level: number): (Candy | null)[][] => {
  console.log(`Creating initial board: ${rows}x${cols}, level ${level}`);
  const board: (Candy | null)[][] = [];
  for (let row = 0; row < rows; row++) {
    board[row] = [];
    for (let col = 0; col < cols; col++) {
      let candy = createCandy(row, col, level);
      
      // Ensure no initial matches
      let attempts = 0;
      while (attempts < 10) {
        const hasMatch = checkWouldCreateMatch(board, candy, row, col);
        if (!hasMatch) break;
        candy = createCandy(row, col, level);
        attempts++;
      }
      
      board[row][col] = candy;
    }
  }
  console.log('Initial board created successfully');
  return board;
};

const checkWouldCreateMatch = (
  board: (Candy | null)[][],
  candy: Candy,
  row: number,
  col: number
): boolean => {
  // Check horizontal
  let horizontalCount = 1;
  
  // Check left
  let checkCol = col - 1;
  while (checkCol >= 0 && board[row][checkCol]?.type === candy.type) {
    horizontalCount++;
    checkCol--;
  }
  
  // Check right
  checkCol = col + 1;
  while (checkCol < board[row].length && board[row][checkCol]?.type === candy.type) {
    horizontalCount++;
    checkCol++;
  }
  
  if (horizontalCount >= 3) return true;
  
  // Check vertical
  let verticalCount = 1;
  
  // Check up
  let checkRow = row - 1;
  while (checkRow >= 0 && board[checkRow][col]?.type === candy.type) {
    verticalCount++;
    checkRow--;
  }
  
  // Check down
  checkRow = row + 1;
  while (checkRow < board.length && board[checkRow][col]?.type === candy.type) {
    verticalCount++;
    checkRow++;
  }
  
  if (verticalCount >= 3) return true;
  
  return false;
};

export const areAdjacent = (pos1: Position, pos2: Position): boolean => {
  const rowDiff = Math.abs(pos1.row - pos2.row);
  const colDiff = Math.abs(pos1.col - pos2.col);
  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
};

export const swapCandies = (
  board: (Candy | null)[][],
  pos1: Position,
  pos2: Position
): (Candy | null)[][] => {
  console.log(`Swapping candies at (${pos1.row},${pos1.col}) and (${pos2.row},${pos2.col})`);
  const newBoard = board.map(row => [...row]);
  const temp = newBoard[pos1.row][pos1.col];
  newBoard[pos1.row][pos1.col] = newBoard[pos2.row][pos2.col];
  newBoard[pos2.row][pos2.col] = temp;
  
  // Update positions
  if (newBoard[pos1.row][pos1.col]) {
    newBoard[pos1.row][pos1.col]!.row = pos1.row;
    newBoard[pos1.row][pos1.col]!.col = pos1.col;
  }
  if (newBoard[pos2.row][pos2.col]) {
    newBoard[pos2.row][pos2.col]!.row = pos2.row;
    newBoard[pos2.row][pos2.col]!.col = pos2.col;
  }
  
  return newBoard;
};

export const findMatches = (board: (Candy | null)[][]): Position[] => {
  const matches: Set<string> = new Set();
  const rows = board.length;
  const cols = board[0].length;
  
  // Check horizontal matches
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols - 2; col++) {
      const candy1 = board[row][col];
      const candy2 = board[row][col + 1];
      const candy3 = board[row][col + 2];
      
      if (candy1 && candy2 && candy3 && 
          candy1.type === candy2.type && 
          candy2.type === candy3.type) {
        matches.add(`${row}-${col}`);
        matches.add(`${row}-${col + 1}`);
        matches.add(`${row}-${col + 2}`);
        
        // Check for longer matches
        let checkCol = col + 3;
        while (checkCol < cols && board[row][checkCol]?.type === candy1.type) {
          matches.add(`${row}-${checkCol}`);
          checkCol++;
        }
      }
    }
  }
  
  // Check vertical matches
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows - 2; row++) {
      const candy1 = board[row][col];
      const candy2 = board[row + 1][col];
      const candy3 = board[row + 2][col];
      
      if (candy1 && candy2 && candy3 && 
          candy1.type === candy2.type && 
          candy2.type === candy3.type) {
        matches.add(`${row}-${col}`);
        matches.add(`${row + 1}-${col}`);
        matches.add(`${row + 2}-${col}`);
        
        // Check for longer matches
        let checkRow = row + 3;
        while (checkRow < rows && board[checkRow][col]?.type === candy1.type) {
          matches.add(`${checkRow}-${col}`);
          checkRow++;
        }
      }
    }
  }
  
  const matchArray = Array.from(matches).map(key => {
    const [row, col] = key.split('-').map(Number);
    return { row, col };
  });
  
  if (matchArray.length > 0) {
    console.log(`Found ${matchArray.length} matches`);
  }
  
  return matchArray;
};

export const removeMatches = (
  board: (Candy | null)[][],
  matches: Position[]
): (Candy | null)[][] => {
  console.log(`Removing ${matches.length} matched candies`);
  const newBoard = board.map(row => [...row]);
  matches.forEach(({ row, col }) => {
    newBoard[row][col] = null;
  });
  return newBoard;
};

export const applyGravity = (board: (Candy | null)[][], level: number): (Candy | null)[][] => {
  console.log('Applying gravity to board');
  const newBoard = board.map(row => [...row]);
  const rows = newBoard.length;
  const cols = newBoard[0].length;
  
  for (let col = 0; col < cols; col++) {
    let emptyRow = rows - 1;
    
    // Move existing candies down
    for (let row = rows - 1; row >= 0; row--) {
      if (newBoard[row][col] !== null) {
        if (row !== emptyRow) {
          newBoard[emptyRow][col] = newBoard[row][col];
          if (newBoard[emptyRow][col]) {
            newBoard[emptyRow][col]!.row = emptyRow;
            newBoard[emptyRow][col]!.col = col;
          }
          newBoard[row][col] = null;
        }
        emptyRow--;
      }
    }
    
    // Fill empty spaces with new candies
    for (let row = emptyRow; row >= 0; row--) {
      newBoard[row][col] = createCandy(row, col, level);
    }
  }
  
  return newBoard;
};

export const hasValidMoves = (board: (Candy | null)[][]): boolean => {
  const rows = board.length;
  const cols = board[0].length;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Try swapping with right neighbor
      if (col < cols - 1) {
        const testBoard = swapCandies(board, { row, col }, { row, col: col + 1 });
        if (findMatches(testBoard).length > 0) {
          return true;
        }
      }
      
      // Try swapping with bottom neighbor
      if (row < rows - 1) {
        const testBoard = swapCandies(board, { row, col }, { row: row + 1, col });
        if (findMatches(testBoard).length > 0) {
          return true;
        }
      }
    }
  }
  
  return false;
};

// Check if board is completely cleared
export const isBoardCleared = (board: (Candy | null)[][]): boolean => {
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      if (board[row][col] !== null) {
        return false;
      }
    }
  }
  return true;
};

// Count candies by type on the board
export const countCandiesByType = (board: (Candy | null)[][]): { [key in CandyType]: number } => {
  const counts: { [key in CandyType]: number } = {
    red: 0,
    blue: 0,
    green: 0,
    yellow: 0,
    purple: 0,
    orange: 0,
  };
  
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const candy = board[row][col];
      if (candy) {
        counts[candy.type]++;
      }
    }
  }
  
  return counts;
};
