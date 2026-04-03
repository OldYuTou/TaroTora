/**
 * 远程终端协议定义
 * 定义客户端与 Agent 之间的通信协议
 */

// ============================================================================
// 基础类型定义
// ============================================================================

/** 消息类型枚举 */
export enum MessageType {
  // 认证相关
  AUTH_REQUEST = 'auth:request',
  AUTH_RESPONSE = 'auth:response',
  AUTH_REFRESH = 'auth:refresh',
  
  // 终端相关
  TERMINAL_CREATE = 'terminal:create',
  TERMINAL_DESTROY = 'terminal:destroy',
  TERMINAL_DATA = 'terminal:data',
  TERMINAL_RESIZE = 'terminal:resize',
  TERMINAL_STATUS = 'terminal:status',
  
  // 文件系统相关
  FS_LIST = 'fs:list',
  FS_READ = 'fs:read',
  FS_WRITE = 'fs:write',
  FS_DELETE = 'fs:delete',
  FS_RENAME = 'fs:rename',
  FS_MKDIR = 'fs:mkdir',
  FS_STAT = 'fs:stat',
  FS_RESPONSE = 'fs:response',
  
  // 进程相关
  PROCESS_LIST = 'process:list',
  PROCESS_KILL = 'process:kill',
  PROCESS_INFO = 'process:info',
  PROCESS_RESPONSE = 'process:response',
  
  // 系统相关
  SYSTEM_INFO = 'system:info',
  SYSTEM_STATS = 'system:stats',
  
  // 错误
  ERROR = 'error',
  
  // 心跳
  PING = 'ping',
  PONG = 'pong',
}

/** 消息状态码 */
export enum StatusCode {
  SUCCESS = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

// ============================================================================
// 认证相关类型
// ============================================================================

/** 认证请求 */
export interface AuthRequest {
  type: MessageType.AUTH_REQUEST;
  username: string;
  password: string;
  clientInfo?: {
    name: string;
    version: string;
    platform: string;
  };
}

/** 认证响应 */
export interface AuthResponse {
  type: MessageType.AUTH_RESPONSE;
  success: boolean;
  token?: string;
  expiresAt?: number;
  publicKeyFingerprint?: string;
  error?: string;
}

/** 令牌刷新请求 */
export interface AuthRefreshRequest {
  type: MessageType.AUTH_REFRESH;
  token: string;
}

// ============================================================================
// 终端相关类型
// ============================================================================

/** 终端配置 */
export interface TerminalConfig {
  shell?: string;
  cwd?: string;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
}

/** 创建终端请求 */
export interface TerminalCreateRequest {
  type: MessageType.TERMINAL_CREATE;
  id: string;
  config?: TerminalConfig;
}

/** 销毁终端请求 */
export interface TerminalDestroyRequest {
  type: MessageType.TERMINAL_DESTROY;
  id: string;
}

/** 终端数据传输 */
export interface TerminalDataMessage {
  type: MessageType.TERMINAL_DATA;
  id: string;
  data: string;
}

/** 终端尺寸调整 */
export interface TerminalResizeMessage {
  type: MessageType.TERMINAL_RESIZE;
  id: string;
  cols: number;
  rows: number;
}

/** 终端状态 */
export interface TerminalStatus {
  type: MessageType.TERMINAL_STATUS;
  id: string;
  status: 'created' | 'running' | 'closed' | 'error';
  pid?: number;
  error?: string;
}

// ============================================================================
// 文件系统相关类型
// ============================================================================

/** 文件/目录信息 */
export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  mtime: number;
  atime: number;
  mode: number;
}

/** 列出目录请求 */
export interface FsListRequest {
  type: MessageType.FS_LIST;
  path: string;
  requestId: string;
}

/** 读取文件请求 */
export interface FsReadRequest {
  type: MessageType.FS_READ;
  path: string;
  encoding?: BufferEncoding;
  requestId: string;
}

/** 写入文件请求 */
export interface FsWriteRequest {
  type: MessageType.FS_WRITE;
  path: string;
  data: string;
  encoding?: BufferEncoding;
  requestId: string;
}

/** 删除文件/目录请求 */
export interface FsDeleteRequest {
  type: MessageType.FS_DELETE;
  path: string;
  recursive?: boolean;
  requestId: string;
}

/** 重命名请求 */
export interface FsRenameRequest {
  type: MessageType.FS_RENAME;
  oldPath: string;
  newPath: string;
  requestId: string;
}

/** 创建目录请求 */
export interface FsMkdirRequest {
  type: MessageType.FS_MKDIR;
  path: string;
  recursive?: boolean;
  requestId: string;
}

/** 获取文件状态请求 */
export interface FsStatRequest {
  type: MessageType.FS_STAT;
  path: string;
  requestId: string;
}

/** 文件系统响应 */
export interface FsResponse {
  type: MessageType.FS_RESPONSE;
  requestId: string;
  success: boolean;
  data?: FileInfo | FileInfo[] | string;
  error?: string;
}

// ============================================================================
// 进程相关类型
// ============================================================================

/** 进程信息 */
export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  status: string;
}

/** 列出进程请求 */
export interface ProcessListRequest {
  type: MessageType.PROCESS_LIST;
  requestId: string;
}

/** 结束进程请求 */
export interface ProcessKillRequest {
  type: MessageType.PROCESS_KILL;
  pid: number;
  force?: boolean;
  requestId: string;
}

/** 获取进程详情请求 */
export interface ProcessInfoRequest {
  type: MessageType.PROCESS_INFO;
  pid: number;
  requestId: string;
}

/** 进程响应 */
export interface ProcessResponse {
  type: MessageType.PROCESS_RESPONSE;
  requestId: string;
  success: boolean;
  data?: ProcessInfo | ProcessInfo[];
  error?: string;
}

// ============================================================================
// 系统相关类型
// ============================================================================

/** 系统信息 */
export interface SystemInfo {
  platform: string;
  arch: string;
  hostname: string;
  release: string;
  cpus: number;
  totalMemory: number;
  agentVersion: string;
}

/** 系统资源统计 */
export interface SystemStats {
  cpuUsage: number;
  memoryUsage: number;
  memoryTotal: number;
  memoryFree: number;
  uptime: number;
  loadAverage?: number[];
}

/** 系统信息请求 */
export interface SystemInfoRequest {
  type: MessageType.SYSTEM_INFO;
  requestId: string;
}

/** 系统统计请求 */
export interface SystemStatsRequest {
  type: MessageType.SYSTEM_STATS;
  requestId: string;
}

// ============================================================================
// 错误类型
// ============================================================================

/** 错误消息 */
export interface ErrorMessage {
  type: MessageType.ERROR;
  code: StatusCode;
  message: string;
  details?: unknown;
}

// ============================================================================
// 心跳类型
// ============================================================================

/** Ping */
export interface PingMessage {
  type: MessageType.PING;
  timestamp: number;
}

/** Pong */
export interface PongMessage {
  type: MessageType.PONG;
  timestamp: number;
  serverTime: number;
}

// ============================================================================
// 联合消息类型
// ============================================================================

/** 所有可能的客户端消息 */
export type ClientMessage =
  | AuthRequest
  | AuthRefreshRequest
  | TerminalCreateRequest
  | TerminalDestroyRequest
  | TerminalDataMessage
  | TerminalResizeMessage
  | FsListRequest
  | FsReadRequest
  | FsWriteRequest
  | FsDeleteRequest
  | FsRenameRequest
  | FsMkdirRequest
  | FsStatRequest
  | ProcessListRequest
  | ProcessKillRequest
  | ProcessInfoRequest
  | SystemInfoRequest
  | SystemStatsRequest
  | PingMessage;

/** 所有可能的服务器消息 */
export type ServerMessage =
  | AuthResponse
  | TerminalStatus
  | TerminalDataMessage
  | FsResponse
  | ProcessResponse
  | ErrorMessage
  | PongMessage;

// ============================================================================
// WebSocket 事件类型（用于 Socket.io）
// ============================================================================

/** Socket.io 事件名 */
export enum SocketEvent {
  MESSAGE = 'message',
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
}

/** 消息包装器 */
export interface MessageWrapper<T = unknown> {
  id: string;
  timestamp: number;
  data: T;
  signature?: string;
}
