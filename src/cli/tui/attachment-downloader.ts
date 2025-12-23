import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigManager } from '../../core/config';

export class AttachmentDownloader {
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  /**
   * Download a single attachment from Jira
   */
  async downloadAttachment(attachment: any): Promise<string> {
    try {
      const authHeader = await this.configManager.getAuthHeader();
      const downloadUrl = attachment.content || attachment.url;

      if (!downloadUrl) {
        throw new Error('Attachment has no download URL');
      }

      // Create downloads directory in user's home
      const downloadsDir = path.join(os.homedir(), 'Downloads', 'jira-attachments');
      if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });
      }

      // Sanitize filename
      const filename = attachment.filename || 'attachment';
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filepath = path.join(downloadsDir, sanitizedFilename);

      // Download file
      const response = await axios.get(downloadUrl, {
        headers: {
          'Authorization': authHeader,
        },
        responseType: 'arraybuffer',
      });

      // Save to file
      fs.writeFileSync(filepath, response.data);

      return filepath;
    } catch (error: any) {
      throw new Error(`Failed to download attachment: ${error.message}`);
    }
  }

  /**
   * Download all attachments for a task
   */
  async downloadAllAttachments(task: any): Promise<string[]> {
    const attachments = task.fields?.attachment || [];
    
    if (attachments.length === 0) {
      throw new Error('No attachments found for this task');
    }

    const downloadedFiles: string[] = [];
    
    for (const attachment of attachments) {
      try {
        const filepath = await this.downloadAttachment(attachment);
        downloadedFiles.push(filepath);
      } catch (error: any) {
        console.error(`Failed to download ${attachment.filename}: ${error.message}`);
      }
    }

    return downloadedFiles;
  }

  /**
   * Download images only (for image viewing feature)
   */
  async downloadImages(task: any): Promise<string[]> {
    const attachments = task.fields?.attachment || [];
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'];
    
    const imageAttachments = attachments.filter((att: any) => {
      const filename = (att.filename || '').toLowerCase();
      return imageExtensions.some(ext => filename.endsWith(ext));
    });

    if (imageAttachments.length === 0) {
      throw new Error('No image attachments found for this task');
    }

    const downloadedImages: string[] = [];
    
    for (const attachment of imageAttachments) {
      try {
        const filepath = await this.downloadAttachment(attachment);
        downloadedImages.push(filepath);
      } catch (error: any) {
        console.error(`Failed to download ${attachment.filename}: ${error.message}`);
      }
    }

    return downloadedImages;
  }
}
