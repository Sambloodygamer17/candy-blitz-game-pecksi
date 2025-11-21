
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import { CandyPiece } from './CandyPiece';
import { GameState, Position } from '@/types/game';
import {
  createInitialBoard,
  areAdjacent,
  swapCandies,
  findMatches,
  removeMatches,
  applyGravity,
  getBoardSize,
} from '@/utils/gameLogic';
import { colors } from '@/styles/commonStyles';
import * as Haptics from 'expo-haptics';

const SCREEN_WIDTH = Dimensions.get('window').width;

export const GameBoard: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    const { rows, cols } = getBoardSize(1);
    return {
      board: createInitialBoard(rows, cols, 1),
      score: 0,
      moves: 30,
      level: 1,
      selectedCandy: null,
      isProcessing: false,
    };
  });

  const gameStateRef = useRef(gameState);
  
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Calculate cell size based on current board dimensions
  const boardRows = gameState.board.length;
  const boardCols = gameState.board[0]?.length || 0;
  const CELL_SIZE = Math.min((SCREEN_WIDTH - 40) / Math.max(boardRows, boardCols), 50);

  const processMatchesWithBoard = useCallback(async (initialBoard: (any | null)[][]) => {
    console.log('Starting processMatches with board');
    let currentBoard = initialBoard.map(row => [...row]);
    let totalMatches = 0;
    let hasMatches = true;
    let iterations = 0;
    const maxIterations = 20;
    const currentLevel = gameStateRef.current.level;
    const currentScore = gameStateRef.current.score;

    while (hasMatches && iterations < maxIterations) {
      iterations++;
      console.log(`Processing iteration ${iterations}`);
      const matches = findMatches(currentBoard);
      
      if (matches.length === 0) {
        console.log('No more matches found');
        hasMatches = false;
        break;
      }

      console.log(`Found ${matches.length} matches in iteration ${iterations}`);
      totalMatches += matches.length;
      
      // Mark candies as matched for breaking animation
      const boardWithMatches = currentBoard.map(row => [...row]);
      matches.forEach(({ row, col }) => {
        if (boardWithMatches[row][col]) {
          boardWithMatches[row][col]!.isMatched = true;
        }
      });

      // Update state to show breaking animation
      setGameState(prev => ({
        ...prev,
        board: boardWithMatches,
      }));

      // Wait for breaking animation to complete
      await new Promise(resolve => setTimeout(resolve, 450));

      // Remove matches
      console.log('Removing matches');
      currentBoard = removeMatches(boardWithMatches, matches);

      // Apply gravity to make candies fall
      console.log('Applying gravity');
      currentBoard = applyGravity(currentBoard, currentLevel);

      // Update state to show falling animation
      setGameState(prev => ({
        ...prev,
        board: currentBoard,
      }));

      // Wait for falling animation to complete
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    console.log(`Total matches processed: ${totalMatches}`);

    if (totalMatches > 0) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      const points = totalMatches * 10 * currentLevel;
      console.log(`Adding ${points} points to score`);
      
      setGameState(prev => ({
        ...prev,
        board: currentBoard,
        score: prev.score + points,
        isProcessing: false,
      }));

      // Check for level up
      if (currentScore + points >= currentLevel * 500) {
        setTimeout(() => {
          const nextLevel = currentLevel + 1;
          const { rows, cols } = getBoardSize(nextLevel);
          
          Alert.alert(
            'Level Up!',
            `Congratulations! You've reached level ${nextLevel}!\nBoard size: ${rows}x${cols}`,
            [
              {
                text: 'Continue',
                onPress: () => {
                  setGameState(prev => ({
                    ...prev,
                    level: nextLevel,
                    moves: 30,
                    board: createInitialBoard(rows, cols, nextLevel),
                  }));
                },
              },
            ]
          );
        }, 500);
      }
    } else {
      console.log('No matches to process, ending');
      setGameState(prev => ({ ...prev, isProcessing: false }));
    }
  }, []);

  const handleCandyPress = useCallback(
    async (row: number, col: number) => {
      if (gameState.isProcessing || gameState.moves <= 0) {
        console.log('Cannot press candy - processing or no moves left');
        return;
      }

      const position: Position = { row, col };

      if (!gameState.selectedCandy) {
        // First selection
        console.log('First candy selected:', position);
        setGameState(prev => ({ ...prev, selectedCandy: position }));
        if (Platform.OS !== 'web') {
          Haptics.selectionAsync();
        }
      } else {
        // Second selection
        if (
          gameState.selectedCandy.row === row &&
          gameState.selectedCandy.col === col
        ) {
          // Deselect
          console.log('Candy deselected');
          setGameState(prev => ({ ...prev, selectedCandy: null }));
          return;
        }

        if (areAdjacent(gameState.selectedCandy, position)) {
          console.log('Adjacent candies - attempting swap');
          setGameState(prev => ({ ...prev, isProcessing: true }));
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }

          // Swap candies
          let newBoard = swapCandies(gameState.board, gameState.selectedCandy, position);
          
          // Check for matches
          const matches = findMatches(newBoard);

          if (matches.length > 0) {
            // Valid move
            console.log('Valid move - matches found:', matches.length);
            setGameState(prev => ({
              ...prev,
              board: newBoard,
              selectedCandy: null,
              moves: prev.moves - 1,
            }));

            // Process matches after a short delay
            setTimeout(() => {
              processMatchesWithBoard(newBoard);
            }, 200);
          } else {
            // Invalid move - swap back
            console.log('Invalid move - no matches, swapping back');
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
            
            setTimeout(() => {
              newBoard = swapCandies(newBoard, gameState.selectedCandy!, position);
              setGameState(prev => ({
                ...prev,
                board: newBoard,
                selectedCandy: null,
                isProcessing: false,
              }));
            }, 300);
          }
        } else {
          // Not adjacent - select new candy
          console.log('Not adjacent - selecting new candy:', position);
          setGameState(prev => ({ ...prev, selectedCandy: position }));
          if (Platform.OS !== 'web') {
            Haptics.selectionAsync();
          }
        }
      }
    },
    [gameState, processMatchesWithBoard]
  );

  const resetGame = () => {
    console.log('Resetting game');
    const { rows, cols } = getBoardSize(1);
    setGameState({
      board: createInitialBoard(rows, cols, 1),
      score: 0,
      moves: 30,
      level: 1,
      selectedCandy: null,
      isProcessing: false,
    });
  };

  useEffect(() => {
    if (gameState.moves <= 0 && !gameState.isProcessing) {
      console.log('Game over - no moves left');
      setTimeout(() => {
        Alert.alert(
          'Game Over',
          `Final Score: ${gameState.score}\nLevel: ${gameState.level}`,
          [
            {
              text: 'Play Again',
              onPress: resetGame,
            },
          ]
        );
      }, 500);
    }
  }, [gameState.moves, gameState.isProcessing, gameState.score, gameState.level]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statContainer}>
          <Text style={styles.statLabel}>Score</Text>
          <Text style={styles.statValue}>{gameState.score}</Text>
        </View>
        <View style={styles.statContainer}>
          <Text style={styles.statLabel}>Level</Text>
          <Text style={styles.statValue}>{gameState.level}</Text>
        </View>
        <View style={styles.statContainer}>
          <Text style={styles.statLabel}>Moves</Text>
          <Text style={styles.statValue}>{gameState.moves}</Text>
        </View>
      </View>

      <Text style={styles.boardSizeText}>
        Board: {boardRows}×{boardCols}
      </Text>

      <View style={styles.boardContainer}>
        {gameState.board.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((candy, colIndex) => {
              if (!candy) return <View key={colIndex} style={{ width: CELL_SIZE, height: CELL_SIZE }} />;
              
              const isSelected =
                gameState.selectedCandy?.row === rowIndex &&
                gameState.selectedCandy?.col === colIndex;

              return (
                <CandyPiece
                  key={candy.id}
                  candy={candy}
                  size={CELL_SIZE}
                  isSelected={isSelected}
                  onPress={() => handleCandyPress(rowIndex, colIndex)}
                />
              );
            })}
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.resetButton} onPress={resetGame}>
        <Text style={styles.resetButtonText}>New Game</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  statContainer: {
    flex: 1,
    backgroundColor: colors.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  boardSizeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  boardContainer: {
    backgroundColor: colors.card,
    padding: 8,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  row: {
    flexDirection: 'row',
  },
  resetButton: {
    marginTop: 20,
    backgroundColor: '#4169E1',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 25,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
