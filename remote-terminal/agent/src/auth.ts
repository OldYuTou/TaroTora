/**
 * 认证模块
 * 处理 RSA 密钥对生成、JWT 令牌管理和用户认证
 */

import { randomBytes, createHash, generateKeyPairSync, createPrivateKey, createPublicKey, sign, verify } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ============================================================================
// 类型定义
// ============================================================================

/** 密钥对配置 */
interface KeyPairOptions {
  bits?: number;
  expirationDays?: number;
}

/** RSA 密钥对 */
export interface RSAKeyPair {
  privateKey: string;
  publicKey: string;
  fingerprint: string;
  createdAt: number;
}

/** JWT Token 载荷 */
export interface JWTPayload {
  sub: string;      // 用户ID/用户名
  iat: number;      // 签发时间
  exp: number;      // 过期时间
  jti: string;      // Token ID
  roles?: string[]; // 角色
}

/** 用户信息 */
export interface User {
  username: string;
  passwordHash: string;
  salt: string;
  roles: string[];
  createdAt: number;
  lastLogin?: number;
  enabled: boolean;
}

/** 认证配置 */
export interface AuthConfig {
  keysDir: string;
  usersFile: string;
  tokenExpirationMinutes: number;
  refreshTokenExpirationDays: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
}

/** 认证结果 */
export interface AuthResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresAt?: number;
  error?: string;
  fingerprint?: string;
}

// ============================================================================
// 默认配置
// ============================================================================

const DEFAULT_CONFIG: AuthConfig = {
  keysDir: join(homedir(), '.remote-terminal', 'keys'),
  usersFile: join(homedir(), '.remote-terminal', 'users.json'),
  tokenExpirationMinutes: 60,
  refreshTokenExpirationDays: 7,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 30,
};

// ============================================================================
// 认证管理器类
// ============================================================================

export class AuthManager {
  private config: AuthConfig;
  private keyPair: RSAKeyPair | null = null;
  private users: Map<string, User> = new Map();
  private loginAttempts: Map<string, { count: number; lockedUntil?: number }> = new Map();
  private activeTokens: Set<string> = new Set();

  constructor(config: Partial<AuthConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initialize();
  }

  // ==========================================================================
  // 初始化
  // ==========================================================================

  /**
   * 初始化认证系统
   * 创建必要的目录，加载或生成密钥对，加载用户
   */
  private initialize(): void {
    // 创建密钥目录
    if (!existsSync(this.config.keysDir)) {
      mkdirSync(this.config.keysDir, { recursive: true });
    }

    // 加载或生成密钥对
    this.keyPair = this.loadOrGenerateKeyPair();

    // 加载用户
    this.loadUsers();
  }

  // ==========================================================================
  // 密钥管理
  // ==========================================================================

  /**
   * 生成新的 RSA 密钥对
   */
  private generateKeyPair(options: KeyPairOptions = {}): RSAKeyPair {
    const bits = options.bits || 2048;
    
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: bits,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    // 计算公钥指纹
    const fingerprint = this.calculateFingerprint(publicKey);

    return {
      privateKey,
      publicKey,
      fingerprint,
      createdAt: Date.now(),
    };
  }

  /**
   * 计算公钥指纹
   */
  private calculateFingerprint(publicKey: string): string {
    const hash = createHash('sha256');
    hash.update(publicKey);
    return hash.digest('hex').substring(0, 16);
  }

  /**
   * 加载或生成密钥对
   */
  private loadOrGenerateKeyPair(): RSAKeyPair {
    const privateKeyPath = join(this.config.keysDir, 'private.pem');
    const publicKeyPath = join(this.config.keysDir, 'public.pem');
    const metaPath = join(this.config.keysDir, 'key-meta.json');

    // 尝试加载现有密钥
    if (existsSync(privateKeyPath) && existsSync(publicKeyPath)) {
      try {
        const privateKey = readFileSync(privateKeyPath, 'utf-8');
        const publicKey = readFileSync(publicKeyPath, 'utf-8');
        const meta = existsSync(metaPath) 
          ? JSON.parse(readFileSync(metaPath, 'utf-8')) 
          : { createdAt: Date.now() };

        const fingerprint = this.calculateFingerprint(publicKey);

        console.log('[Auth] 已加载现有密钥对，指纹:', fingerprint);

        return {
          privateKey,
          publicKey,
          fingerprint,
          createdAt: meta.createdAt,
        };
      } catch (error) {
        console.error('[Auth] 加载密钥失败，重新生成:', error);
      }
    }

    // 生成新密钥对
    const keyPair = this.generateKeyPair();

    // 保存密钥
    writeFileSync(privateKeyPath, keyPair.privateKey, { mode: 0o600 }); // 仅所有者可读写
    writeFileSync(publicKeyPath, keyPair.publicKey, { mode: 0o644 });
    writeFileSync(metaPath, JSON.stringify({ createdAt: keyPair.createdAt }), { mode: 0o600 });

    console.log('[Auth] 已生成新的密钥对，指纹:', keyPair.fingerprint);

    return keyPair;
  }

  /**
   * 获取公钥指纹
   */
  getFingerprint(): string | null {
    return this.keyPair?.fingerprint || null;
  }

  /**
   * 获取公钥
   */
  getPublicKey(): string | null {
    return this.keyPair?.publicKey || null;
  }

  // ==========================================================================
  // 用户管理
  // ==========================================================================

  /**
   * 加载用户列表
   */
  private loadUsers(): void {
    if (!existsSync(this.config.usersFile)) {
      // 创建默认管理员用户
      this.createDefaultUser();
      return;
    }

    try {
      const data = readFileSync(this.config.usersFile, 'utf-8');
      const usersArray: User[] = JSON.parse(data);
      
      usersArray.forEach(user => {
        this.users.set(user.username, user);
      });

      console.log(`[Auth] 已加载 ${this.users.size} 个用户`);
    } catch (error) {
      console.error('[Auth] 加载用户失败:', error);
      this.createDefaultUser();
    }
  }

  /**
   * 保存用户列表
   */
  private saveUsers(): void {
    const usersArray = Array.from(this.users.values());
    writeFileSync(this.config.usersFile, JSON.stringify(usersArray, null, 2), { mode: 0o600 });
  }

  /**
   * 创建默认用户
   */
  private createDefaultUser(): void {
    const defaultUsername = 'admin';
    const defaultPassword = this.generateRandomPassword(12);
    
    this.createUser(defaultUsername, defaultPassword, ['admin']);
    
    console.log('[Auth] =========================================');
    console.log('[Auth] 已创建默认管理员用户');
    console.log('[Auth] 用户名: admin');
    console.log('[Auth] 密码:', defaultPassword);
    console.log('[Auth] =========================================');
  }

  /**
   * 生成随机密码
   */
  private generateRandomPassword(length: number): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    const bytes = randomBytes(length);
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset[bytes[i] % charset.length];
    }
    return password;
  }

  /**
   * 创建新用户
   */
  createUser(username: string, password: string, roles: string[] = ['user']): boolean {
    if (this.users.has(username)) {
      return false;
    }

    const salt = randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(password, salt);

    const user: User = {
      username,
      passwordHash,
      salt,
      roles,
      createdAt: Date.now(),
      enabled: true,
    };

    this.users.set(username, user);
    this.saveUsers();

    return true;
  }

  /**
   * 删除用户
   */
  deleteUser(username: string): boolean {
    if (!this.users.has(username)) {
      return false;
    }

    this.users.delete(username);
    this.saveUsers();
    return true;
  }

  /**
   * 更新用户密码
   */
  updatePassword(username: string, newPassword: string): boolean {
    const user = this.users.get(username);
    if (!user) {
      return false;
    }

    const salt = randomBytes(16).toString('hex');
    user.passwordHash = this.hashPassword(newPassword, salt);
    user.salt = salt;
    
    this.saveUsers();
    return true;
  }

  /**
   * 启用/禁用用户
   */
  setUserEnabled(username: string, enabled: boolean): boolean {
    const user = this.users.get(username);
    if (!user) {
      return false;
    }

    user.enabled = enabled;
    this.saveUsers();
    return true;
  }

  /**
   * 获取所有用户列表
   */
  listUsers(): Omit<User, 'passwordHash' | 'salt'>[] {
    return Array.from(this.users.values()).map(user => ({
      username: user.username,
      roles: user.roles,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      enabled: user.enabled,
    }));
  }

  // ==========================================================================
  // 密码处理
  // ==========================================================================

  /**
   * 哈希密码
   */
  private hashPassword(password: string, salt: string): string {
    const hash = createHash('sha256');
    hash.update(password + salt);
    return hash.digest('hex');
  }

  /**
   * 验证密码
   */
  private verifyPassword(password: string, user: User): boolean {
    const hash = this.hashPassword(password, user.salt);
    return hash === user.passwordHash;
  }

  // ==========================================================================
  // 登录尝试限制
  // ==========================================================================

  /**
   * 检查是否被锁定
   */
  private isLocked(username: string): boolean {
    const attempts = this.loginAttempts.get(username);
    if (!attempts || !attempts.lockedUntil) {
      return false;
    }

    if (Date.now() > attempts.lockedUntil) {
      // 解锁
      this.loginAttempts.delete(username);
      return false;
    }

    return true;
  }

  /**
   * 记录登录失败
   */
  private recordFailedAttempt(username: string): void {
    const attempts = this.loginAttempts.get(username) || { count: 0 };
    attempts.count++;

    if (attempts.count >= this.config.maxLoginAttempts) {
      attempts.lockedUntil = Date.now() + this.config.lockoutDurationMinutes * 60 * 1000;
      console.warn(`[Auth] 用户 ${username} 已被锁定 ${this.config.lockoutDurationMinutes} 分钟`);
    }

    this.loginAttempts.set(username, attempts);
  }

  /**
   * 清除登录尝试记录
   */
  private clearLoginAttempts(username: string): void {
    this.loginAttempts.delete(username);
  }

  // ==========================================================================
  // JWT Token 管理
  // ==========================================================================

  /**
   * 生成 JWT Token (简化实现，不依赖外部库)
   * 格式: base64url(header).base64url(payload).signature
   */
  private generateJWT(payload: Omit<JWTPayload, 'iat' | 'jti'>): string {
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: JWTPayload = {
      ...payload,
      iat: now,
      jti: randomBytes(16).toString('hex'),
    };

    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    const data = `${encodedHeader}.${encodedPayload}`;

    // 使用私钥签名
    const signature = sign('sha256', Buffer.from(data), this.keyPair!.privateKey);
    const encodedSignature = signature.toString('base64url');

    return `${data}.${encodedSignature}`;
  }

  /**
   * 验证 JWT Token
   */
  private verifyJWT(token: string): JWTPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const [encodedHeader, encodedPayload, encodedSignature] = parts;
      const data = `${encodedHeader}.${encodedPayload}`;

      const signature = Buffer.from(encodedSignature, 'base64url');
      const isValid = verify('sha256', Buffer.from(data), this.keyPair!.publicKey, signature);

      if (!isValid) {
        return null;
      }

      const payload: JWTPayload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());

      // 检查是否过期
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        return null;
      }

      // 检查 Token 是否被撤销
      if (!this.activeTokens.has(payload.jti)) {
        return null;
      }

      return payload;
    } catch (error) {
      return null;
    }
  }

  // ==========================================================================
  // 认证接口
  // ==========================================================================

  /**
   * 用户登录
   */
  authenticate(username: string, password: string): AuthResult {
    // 检查是否被锁定
    if (this.isLocked(username)) {
      const attempts = this.loginAttempts.get(username)!;
      const remainingMinutes = Math.ceil((attempts.lockedUntil! - Date.now()) / 60000);
      return {
        success: false,
        error: `账户已被锁定，请 ${remainingMinutes} 分钟后重试`,
      };
    }

    // 验证用户
    const user = this.users.get(username);
    if (!user || !user.enabled) {
      this.recordFailedAttempt(username);
      return {
        success: false,
        error: '用户名或密码错误',
      };
    }

    // 验证密码
    if (!this.verifyPassword(password, user)) {
      this.recordFailedAttempt(username);
      return {
        success: false,
        error: '用户名或密码错误',
      };
    }

    // 登录成功
    this.clearLoginAttempts(username);
    user.lastLogin = Date.now();
    this.saveUsers();

    // 生成 Token
    const expiresAt = Date.now() + this.config.tokenExpirationMinutes * 60 * 1000;
    const token = this.generateJWT({
      sub: username,
      exp: Math.floor(expiresAt / 1000),
      roles: user.roles,
    });

    // 记录活跃 Token
    const payload = this.verifyJWT(token);
    if (payload) {
      this.activeTokens.add(payload.jti);
    }

    return {
      success: true,
      token,
      expiresAt,
      fingerprint: this.keyPair!.fingerprint,
    };
  }

  /**
   * 验证 Token
   */
  verifyToken(token: string): { valid: boolean; username?: string; roles?: string[] } {
    const payload = this.verifyJWT(token);
    
    if (!payload) {
      return { valid: false };
    }

    return {
      valid: true,
      username: payload.sub,
      roles: payload.roles,
    };
  }

  /**
   * 刷新 Token
   */
  refreshToken(token: string): AuthResult {
    const payload = this.verifyJWT(token);
    
    if (!payload) {
      return {
        success: false,
        error: '无效的 Token',
      };
    }

    // 撤销旧 Token
    this.activeTokens.delete(payload.jti);

    // 生成新 Token
    const expiresAt = Date.now() + this.config.tokenExpirationMinutes * 60 * 1000;
    const newToken = this.generateJWT({
      sub: payload.sub,
      exp: Math.floor(expiresAt / 1000),
      roles: payload.roles,
    });

    // 记录新 Token
    const newPayload = this.verifyJWT(newToken);
    if (newPayload) {
      this.activeTokens.add(newPayload.jti);
    }

    return {
      success: true,
      token: newToken,
      expiresAt,
    };
  }

  /**
   * 注销 Token
   */
  revokeToken(token: string): boolean {
    const payload = this.verifyJWT(token);
    if (payload) {
      this.activeTokens.delete(payload.jti);
      return true;
    }
    return false;
  }

  /**
   * 生成连接密钥（用于二维码扫描连接）
   * 格式: base64(fingerprint:token)
   */
  generateConnectionKey(username: string, password: string): string | null {
    const result = this.authenticate(username, password);
    if (!result.success || !result.token) {
      return null;
    }

    const data = `${result.fingerprint}:${result.token}`;
    return Buffer.from(data).toString('base64url');
  }
}

// 导出单例
export const authManager = new AuthManager();
