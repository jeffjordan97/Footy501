export {
  searchPlayers,
  getPlayerStat,
  getPlayersForCategory,
  type PlayerSearchResult,
  type PlayerWithStat,
} from './player-service.js';

export {
  getAvailableCategories,
  type StatCategoryOption,
} from './category-service.js';

export {
  createGame,
  submitGameAnswer,
  handleGameTimeout,
  getGame,
  type CreateGameParams,
  type GameAnswerResult,
} from './game-service.js';

export {
  createRoom,
  joinRoom,
  getRoom,
  removeRoom,
  findRoomBySocketId,
  removeGuestFromRoom,
  setRoomGameId,
  cleanupStaleRooms,
  getActiveRoomCount,
  toRoomDetail,
  generateRoomCode,
  type Room,
} from './room-service.js';

export {
  enqueue,
  dequeue,
  tryMatch,
  getQueueLength,
  isInQueue,
  type QueueEntry,
} from './matchmaking-service.js';
