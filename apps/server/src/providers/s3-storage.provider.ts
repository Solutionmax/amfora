import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  UploadPartCommand,
  UploadPartCopyCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { bucketName, createPublicS3Client, s3Client } from "../config/storage.config";
import { StorageProvider } from "../types/storage";
import { getContentType } from "../utils/mime-types";

export class S3StorageProvider implements StorageProvider {
  private ensureClient() {
    if (!s3Client) {
      throw new Error("S3 client is not configured. Storage is initializing, please wait...");
    }
    return s3Client;
  }

  /**
   * Check if a character is valid in an HTTP token (RFC 2616)
   * Tokens can contain: alphanumeric and !#$%&'*+-.^_`|~
   * Must exclude separators: ()<>@,;:\"/[]?={} and space/tab
   */
  private isTokenChar(char: string): boolean {
    const code = char.charCodeAt(0);
    // Basic ASCII range check
    if (code < 33 || code > 126) return false;
    // Exclude separator characters per RFC 2616
    const separators = '()<>@,;:\\"/[]?={} \t';
    return !separators.includes(char);
  }

  /**
   * Safely encode filename for Content-Disposition header
   */
  private encodeFilenameForHeader(filename: string): string {
    if (!filename || filename.trim() === "") {
      return 'attachment; filename="download"';
    }

    let sanitized = filename
      .replace(/"/g, "'")
      .replace(/[\r\n\t\v\f]/g, "")
      .replace(/[\\|/]/g, "-")
      .replace(/[<>:|*?]/g, "");

    sanitized = sanitized
      .split("")
      .filter((char) => {
        const code = char.charCodeAt(0);
        return code >= 32 && !(code >= 127 && code <= 159);
      })
      .join("")
      .trim();

    if (!sanitized) {
      return 'attachment; filename="download"';
    }

    // Create ASCII-safe version with only valid token characters
    const asciiSafe = sanitized
      .split("")
      .filter((char) => this.isTokenChar(char))
      .join("");

    if (asciiSafe && asciiSafe.trim()) {
      const encoded = encodeURIComponent(sanitized);
      return `attachment; filename="${asciiSafe}"; filename*=UTF-8''${encoded}`;
    } else {
      const encoded = encodeURIComponent(sanitized);
      return `attachment; filename*=UTF-8''${encoded}`;
    }
  }

  async getPresignedPutUrl(objectName: string, expires: number, size?: number): Promise<string> {
    // Always use public S3 client for presigned URLs (uses SERVER_IP)
    const client = createPublicS3Client();
    if (!client) {
      throw new Error("S3 client could not be created");
    }

    const command = new PutObjectCommand({
      ...(size !== undefined ? { ContentLength: size } : {}),
      Bucket: bucketName,
      Key: objectName,
    });

    return await getSignedUrl(client, command, {
      expiresIn: expires,
      unsignableHeaders: new Set(["x-amz-checksum-crc32"]),
    });
  }

  async getPresignedGetUrl(objectName: string, expires: number, fileName?: string): Promise<string> {
    // Always use public S3 client for presigned URLs (uses SERVER_IP)
    const client = createPublicS3Client();
    if (!client) {
      throw new Error("S3 client could not be created");
    }

    let rcdFileName: string;

    if (fileName && fileName.trim() !== "") {
      rcdFileName = fileName;
    } else {
      const lastSlashIndex = objectName.lastIndexOf("/");
      rcdFileName = lastSlashIndex !== -1 ? objectName.substring(lastSlashIndex + 1) : objectName;
      if (!rcdFileName) {
        rcdFileName = "downloaded_file";
      }
    }

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectName,
      ResponseContentDisposition: this.encodeFilenameForHeader(rcdFileName),
      ResponseContentType: getContentType(rcdFileName),
    });

    return await getSignedUrl(client, command, { expiresIn: expires });
  }

  async deleteObject(objectName: string): Promise<void> {
    const client = this.ensureClient();

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: objectName,
    });

    await client.send(command);
  }

  async getObjectSize(objectName: string): Promise<number> {
    const response = await this.ensureClient().send(new HeadObjectCommand({ Bucket: bucketName, Key: objectName }));
    if (response.ContentLength === undefined) throw new Error("Stored file size unavailable");
    return response.ContentLength;
  }

  async copyObject(source: string, destination: string): Promise<void> {
    const client = this.ensureClient();
    const metadata = await client.send(new HeadObjectCommand({ Bucket: bucketName, Key: source }));
    const copySource = `${bucketName}/${source.split("/").map(encodeURIComponent).join("/")}`;
    const size = metadata.ContentLength ?? 0;
    if (size <= 5 * 1024 ** 3) {
      await client.send(
        new CopyObjectCommand({
          Bucket: bucketName,
          Key: destination,
          CopySource: copySource,
          CopySourceIfMatch: metadata.ETag,
        })
      );
      return;
    }
    const uploadId = await this.createMultipartUpload(destination);
    try {
      const parts: Array<{ PartNumber: number; ETag: string }> = [];
      const partSize = Math.max(512 * 1024 ** 2, Math.ceil(size / 10000));
      for (let start = 0; start < size; start += partSize) {
        const partNumber = parts.length + 1;
        const result = await client.send(
          new UploadPartCopyCommand({
            Bucket: bucketName,
            Key: destination,
            UploadId: uploadId,
            PartNumber: partNumber,
            CopySource: copySource,
            CopySourceIfMatch: metadata.ETag,
            CopySourceRange: `bytes=${start}-${Math.min(start + partSize, size) - 1}`,
          })
        );
        if (!result.CopyPartResult?.ETag) throw new Error("Storage copy did not return an ETag");
        parts.push({ PartNumber: partNumber, ETag: result.CopyPartResult.ETag });
      }
      await this.completeMultipartUpload(destination, uploadId, parts);
    } catch (error) {
      await this.abortMultipartUpload(destination, uploadId).catch(() => undefined);
      throw error;
    }
  }

  async fileExists(objectName: string): Promise<boolean> {
    const client = this.ensureClient();

    try {
      const command = new HeadObjectCommand({
        Bucket: bucketName,
        Key: objectName,
      });

      await client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get a readable stream for downloading an object
   * Used for proxying downloads through the backend
   */
  async getObjectStream(objectName: string): Promise<NodeJS.ReadableStream> {
    const client = this.ensureClient();

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectName,
    });

    const response = await client.send(command);

    if (!response.Body) {
      throw new Error("No body in S3 response");
    }

    // AWS SDK v3 returns a readable stream
    return response.Body as NodeJS.ReadableStream;
  }

  /**
   * Initialize a multipart upload
   * Returns uploadId for subsequent part uploads
   */
  async createMultipartUpload(objectName: string): Promise<string> {
    const client = this.ensureClient();

    const command = new CreateMultipartUploadCommand({
      Bucket: bucketName,
      Key: objectName,
    });

    const response = await client.send(command);

    if (!response.UploadId) {
      throw new Error("Failed to create multipart upload - no UploadId returned");
    }

    return response.UploadId;
  }

  /**
   * Get presigned URL for uploading a specific part
   */
  async getPresignedPartUrl(
    objectName: string,
    uploadId: string,
    partNumber: number,
    expires: number
  ): Promise<string> {
    const client = createPublicS3Client();
    if (!client) {
      throw new Error("S3 client could not be created");
    }

    const command = new UploadPartCommand({
      Bucket: bucketName,
      Key: objectName,
      UploadId: uploadId,
      PartNumber: partNumber,
    });

    const url = await getSignedUrl(client, command, {
      expiresIn: expires,
      unsignableHeaders: new Set(["x-amz-checksum-crc32"]),
    });
    return url;
  }

  /**
   * Complete a multipart upload
   */
  async completeMultipartUpload(
    objectName: string,
    uploadId: string,
    parts: Array<{ PartNumber: number; ETag: string }>
  ): Promise<void> {
    const client = this.ensureClient();

    const command = new CompleteMultipartUploadCommand({
      Bucket: bucketName,
      Key: objectName,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map((part) => ({
          PartNumber: part.PartNumber,
          ETag: part.ETag,
        })),
      },
    });

    await client.send(command);
  }

  /**
   * Abort a multipart upload
   */
  async abortMultipartUpload(objectName: string, uploadId: string): Promise<void> {
    const client = this.ensureClient();

    const command = new AbortMultipartUploadCommand({
      Bucket: bucketName,
      Key: objectName,
      UploadId: uploadId,
    });

    await client.send(command);
  }
}
