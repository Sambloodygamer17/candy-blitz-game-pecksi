
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import { CandyPiece } from './CandyPiece';
import { GameState, Position, CandyType } from '@/types/game';
import {
  createInitialBoard,
  areAdjacent,
  swapCandies,
  findMatches,
  removeMatches,
  applyGravity,
  getLevelConfig,
  isBoardCleared,
  getCandyColor,
  hasValidMoves,
  randomizeBoard,
} from '@/utils/gameLogic';
import { colors } from '@/styles/commonStyles';
import * as Haptics from 'expo-haptics';

const SCREEN_WIDTH = Dimensions.get('window').width;

export const GameBoard: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    const levelConfig = getLevelConfig(1);
    return {
      board: createInitialBoard(levelConfig.boardSize.rows, levelConfig.boardSize.cols, 1),
      score: 0,
      moves: levelConfig.moves,
      level: 1,
      selectedCandy: null,
      isProcessing: false,
      objective: levelConfig.objective,
      collectedColors: {
        red: 0,
        blue: 0,
        green: 0,
        yellow: 0,
        purple: 0,
        orange: 0,
      },
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

  const checkLevelComplete = useCallback((currentState: GameState): boolean => {
    const { objective, collectedColors } = currentState;
    
    if (objective.type === 'collect_colors' && objective.targetColors) {
      // Check if all color targets are met
      for (const [color, target] of Object.entries(objective.targetColors)) {
        if (collectedColors[color as CandyType] < target) {
          return false;
        }
      }
      return true;
    }
    
    return false;
  }, []);

  const checkAndRandomizeIfNeeded = useCallback(async (currentBoard: (any | null)[][]) => {
    console.log('Checking if board has valid moves...');
    
    // Check if there are any valid moves
    if (!hasValidMoves(currentBoard)) {
      console.log('No valid moves found! Randomizing board...');
      
      // Show a brief message to the user
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      
      // Wait a moment before randomizing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Randomize the board
      const randomizedBoard = randomizeBoard(currentBoard, gameStateRef.current.level);
      
      // Update the board state
      setGameState(prev => ({
        ...prev,
        board: randomizedBoard,
        isProcessing: false,
      }));
      
      console.log('Board randomized successfully');
      return true;
    }
    
    console.log('Valid moves available');
    return false;
  }, []);

  const processMatchesWithBoard = useCallback(async (initialBoard: (any | null)[][], matchedCandies: Position[]) => {
    console.log('Starting processMatches with board');
    let currentBoard = initialBoard.map(row => [...row]);
    let totalMatches = 0;
    let hasMatches = true;
    let iterations = 0;
    const maxIterations = 20;
    const currentLevel = gameStateRef.current.level;
    const currentScore = gameStateRef.current.score;
    const currentCollected = { ...gameStateRef.current.collectedColors };

    // Track colors from initial matches
    console.log('Tracking initial matched candies:', matchedCandies.length);
    matchedCandies.forEach(({ row, col }) => {
      const candy = currentBoard[row][col];
      if (candy) {
        currentCollected[candy.type]++;
        console.log(`Collected ${candy.type}, new count: ${currentCollected[candy.type]}`);
      }
    });

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
      
      // Track collected colors from cascading matches
      matches.forEach(({ row, col }) => {
        const candy = currentBoard[row][col];
        if (candy) {
          currentCollected[candy.type]++;
          console.log(`Collected ${candy.type}, new count: ${currentCollected[candy.type]}`);
        }
      });

      // Mark candies as matched for breaking animation
      const boardWithMatches = currentBoard.map(row => [...row]);
      matches.forEach(({ row, col }) => {
        if (boardWithMatches[row][col]) {
          boardWithMatches[row][col]!.isMatched = true;
        }
      });

      // Update state to show breaking animation and current collected colors
      setGameState(prev => ({
        ...prev,
        board: boardWithMatches,
        collectedColors: { ...currentCollected },
      }));

      // Wait for breaking animation to complete
      await new Promise(resolve => setTimeout(resolve, 450));

      // Remove matches
      console.log('Removing matches');
      currentBoard = removeMatches(boardWithMatches, matches);

      // Apply gravity to make candies fall
      console.log('Applying gravity');
      currentBoard = applyGravity(currentBoard, currentLevel);

      // Update state to show falling animation with updated collected colors
      setGameState(prev => ({
        ...prev,
        board: currentBoard,
        collectedColors: { ...currentCollected },
      }));

      // Wait for falling animation to complete
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    console.log(`Total matches processed: ${totalMatches}`);
    console.log('Final collected colors:', currentCollected);

    if (totalMatches > 0) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      const points = totalMatches * 10 * currentLevel;
      console.log(`Adding ${points} points to score`);
      
      const updatedState: GameState = {
        ...gameStateRef.current,
        board: currentBoard,
        score: currentScore + points,
        collectedColors: { ...currentCollected },
        isProcessing: false,
      };

      setGameState(updatedState);

      // Check if level is complete
      setTimeout(() => {
        if (checkLevelComplete(updatedState)) {
          console.log('Level complete!');
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          
          const nextLevel = currentLevel + 1;
          const nextLevelConfig = getLevelConfig(nextLevel);
          
          Alert.alert(
            'Level Complete! 🎉',
            `Congratulations! You&apos;ve completed level ${currentLevel}!\n\nNext Level: ${nextLevel}\nBoard size: ${nextLevelConfig.boardSize.rows}×${nextLevelConfig.boardSize.cols}\nMoves: ${nextLevelConfig.moves}`,
            [
              {
                text: 'Continue',
                onPress: () => {
                  setGameState({
                    board: createInitialBoard(
                      nextLevelConfig.boardSize.rows,
                      nextLevelConfig.boardSize.cols,
                      nextLevel
                    ),
                    score: updatedState.score,
                    moves: nextLevelConfig.moves,
                    level: nextLevel,
                    selectedCandy: null,
                    isProcessing: false,
                    objective: nextLevelConfig.objective,
                    collectedColors: {
                      red: 0,
                      blue: 0,
                      green: 0,
                      yellow: 0,
                      purple: 0,
                      orange: 0,
                    },
                  });
                },
              },
            ]
          );
        } else {
          // Level not complete, check if board needs randomization
          checkAndRandomizeIfNeeded(currentBoard);
        }
      }, 500);
    } else {
      console.log('No matches to process, checking for valid moves');
      setGameState(prev => ({ ...prev, isProcessing: false }));
      
      // Check if board needs randomization after a short delay
      setTimeout(() => {
        checkAndRandomizeIfNeeded(currentBoard);
      }, 300);
    }
  }, [checkLevelComplete, checkAndRandomizeIfNeeded]);

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
              processMatchesWithBoard(newBoard, matches);
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
    const levelConfig = getLevelConfig(1);
    setGameState({
      board: createInitialBoard(levelConfig.boardSize.rows, levelConfig.boardSize.cols, 1),
      score: 0,
      moves: levelConfig.moves,
      level: 1,
      selectedCandy: null,
      isProcessing: false,
      objective: levelConfig.objective,
      collectedColors: {
        red: 0,
        blue: 0,
        green: 0,
        yellow: 0,
        purple: 0,
        orange: 0,
      },
    });
  };

  useEffect(() => {
    if (gameState.moves <= 0 && !gameState.isProcessing) {
      console.log('Game over - no moves left');
      
      // Check if objective was completed
      const isComplete = checkLevelComplete(gameState);
      
      if (!isComplete) {
        setTimeout(() => {
          Alert.alert(
            'Level Failed',
            `You ran out of moves!\n\nFinal Score: ${gameState.score}\nLevel: ${gameState.level}`,
            [
              {
                text: 'Try Again',
                onPress: () => {
                  const levelConfig = getLevelConfig(gameState.level);
                  setGameState(prev => ({
                    ...prev,
                    board: createInitialBoard(
                      levelConfig.boardSize.rows,
                      levelConfig.boardSize.cols,
                      gameState.level
                    ),
                    moves: levelConfig.moves,
                    selectedCandy: null,
                    isProcessing: false,
                    collectedColors: {
                      red: 0,
                      blue: 0,
                      green: 0,
                      yellow: 0,
                      purple: 0,
                      orange: 0,
                    },
                  }));
                },
              },
              {
                text: 'Main Menu',
                onPress: resetGame,
              },
            ]
          );
        }, 500);
      }
    }
  }, [gameState.moves, gameState.isProcessing, gameState.score, gameState.level, checkLevelComplete]);

  const renderObjectiveProgress = () => {
    const { objective, collectedColors } = gameState;
    
    if (objective.type === 'collect_colors' && objective.targetColors) {
      return (
        <View style={styles.objectiveContainer}>
          <Text style={styles.objectiveTitle}>Objective</Text>
          <Text style={styles.objectiveText}>{objective.description}</Text>
          <View style={styles.colorTargetsContainer}>
            {Object.entries(objective.targetColors).map(([color, target]) => {
              const collected = collectedColors[color as CandyType];
              const progress = Math.min(collected / target, 1);
              const isComplete = collected >= target;
              
              return (
                <View key={color} style={styles.colorTarget}>
                  <View 
                    style={[
                      styles.colorDot, 
                      { backgroundColor: getCandyColor(color as CandyType) }
                    ]} 
                  />
                  <Text style={[styles.colorTargetText, isComplete && styles.colorTargetComplete]}>
                    {collected} / {target}
                  </Text>
                  {isComplete && <Text style={styles.checkmark}>✓</Text>}
                </View>
              );
            })}
          </View>
        </View>
      );
    }
    
    return null;
  };

  return (
    <ScrollView 
      style={styles.scrollContainer}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
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
          <Text style={[styles.statValue, gameState.moves <= 5 && styles.lowMoves]}>
            {gameState.moves}
          </Text>
        </View>
      </View>

      {renderObjectiveProgress()}

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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  container: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 140,
    paddingHorizontal: 10,
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
  lowMoves: {
    color: '#E74C3C',
  },
  objectiveContainer: {
    width: '90%',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  objectiveTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4169E1',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  objectiveText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2ECC71',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  colorTargetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  colorTarget: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  colorTargetText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  colorTargetComplete: {
    color: '#2ECC71',
    textDecorationLine: 'line-through',
  },
  checkmark: {
    fontSize: 16,
    color: '#2ECC71',
    fontWeight: '700',
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
