/**
 * ?쎇截?KzmKernelLogger (v1.0 - OS Standard Logging)
 * ========================================================
 * Patterns: Singleton, Observer.
 * Knowledge: ISO/IEC 25010 Quality Model, Fault Tolerance.
 */

export type KzmLogLevel = 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface KzmLogEntry {
  timestamp: string;
  level: KzmLogLevel;
  module: string;
  message: string;
  stack?: string;
  metadata?: {
    layer?: string;
    coords?: string;
    zFinal?: number;
    visualHealth?: string;
  };
}

export class KzmKernelLogger {
  private static instance: KzmKernelLogger;
  private readonly LOG_KEY = 'KZM_OS_LOGS';
  private readonly MAX_LOGS = 500;
  private logs: KzmLogEntry[] = [];

  private constructor() {
    this.loadPersistedLogs();
    this.bindGlobalFaultHandlers();
  }

  public static get(): KzmKernelLogger {
    if (!KzmKernelLogger.instance) KzmKernelLogger.instance = new KzmKernelLogger();
    return KzmKernelLogger.instance;
  }

  /**
   * ?룛截?[LOG] Central System Call
   */
  public log(level: KzmLogLevel, module: string, message: string, detail?: { error?: any, metadata?: KzmLogEntry['metadata'] }): void {
    const entry: KzmLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      stack: detail?.error instanceof Error ? detail.error.stack : undefined,
      metadata: detail?.metadata
    };

    this.logs.push(entry);
    if (this.logs.length > this.MAX_LOGS) this.logs.shift();

    this.persist();
    this.printToConsole(entry);

    if (level === 'FATAL') {
      window.dispatchEvent(new CustomEvent('kzm-kernel-panic', { detail: entry }));
    }
  }

  private loadPersistedLogs(): void {
    try {
      const stored = localStorage.getItem(this.LOG_KEY);
      if (stored) this.logs = JSON.parse(stored);
    } catch (e) {
      console.error("?뵦 [KERNEL] Log Persistence Corruption Detected.");
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(this.LOG_KEY, JSON.stringify(this.logs));
    } catch (e) {
      // Storage quota exceeded?
    }
  }

  private bindGlobalFaultHandlers(): void {
    window.onerror = (msg, url, line, col, error) => {
      this.log('FATAL', 'KERNEL_PANIC', `${msg} at ${line}:${col}`, { error });
      return false;
    };

    window.onunhandledrejection = (event) => {
      this.log('ERROR', 'ASYNC_FAULT', `Unhandled Promise: ${event.reason}`);
    };
  }

  private printToConsole(entry: KzmLogEntry): void {
    const color = {
      INFO: '#4CAF50',
      WARN: '#FFC107',
      ERROR: '#F44336',
      FATAL: '#D32F2F'
    }[entry.level];

    console.log(
      `%c[${entry.level}] %c${entry.module}: %c${entry.message}`,
      `color: ${color}; font-weight: bold;`,
      `color: #9D50FF;`,
      `color: #fff;`
    );
  }

  public getLogs(): KzmLogEntry[] {
    return [...this.logs];
  }

  public clear(): void {
    this.logs = [];
    localStorage.removeItem(this.LOG_KEY);
  }
}

export const $log = KzmKernelLogger.get();
