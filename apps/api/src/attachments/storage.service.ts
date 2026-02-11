import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface StorageProvider {
  saveFile(workOrderId: string, filename: string, buffer: Buffer): Promise<string>;
  getFilePath(relativePath: string): string;
  deleteFile(relativePath: string): Promise<void>;
}

@Injectable()
export class StorageService implements StorageProvider {
  private basePath: string;

  constructor(private config: ConfigService) {
    this.basePath = config.get<string>('STORAGE_PATH') || './storage';
    this.ensureDirectory(this.basePath);
  }

  private ensureDirectory(dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async saveFile(workOrderId: string, filename: string, buffer: Buffer): Promise<string> {
    const dir = path.join(this.basePath, workOrderId);
    this.ensureDirectory(dir);

    const filePath = path.join(dir, filename);
    await fs.promises.writeFile(filePath, buffer);

    return path.join(workOrderId, filename);
  }

  getFilePath(relativePath: string): string {
    return path.join(this.basePath, relativePath);
  }

  async deleteFile(relativePath: string): Promise<void> {
    const fullPath = this.getFilePath(relativePath);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }
}
