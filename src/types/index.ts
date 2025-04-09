/**
 * Information about the current progress of the merge operation
 */
export interface ProgressInfo {
  /** Progress percentage (0-100) */
  progress: number;
  /** Number of bytes processed */
  processedBytes: number;
  /** Processing speed in MB/s */
  speed: number;
  /** Information about the buffer */
  bufferInfo: {
    /** Current buffer size */
    bufferSize: number;
    /** Buffer growth rate */
    bufferGrowth: number;
  };
}

/**
 * Options for the merge operation
 */
export interface MergeOptions {
  /** Callback function to receive progress updates */
  onProgress?: (info: ProgressInfo) => void;
}

/**
 * Structure of a JSON object in the files being merged
 */
export interface JsonObject {
  /** Unique identifier for the object */
  id: string;
  /** Timestamp of when the object was created */
  timestamp: number;
  /** Data content of the object */
  data: string;
} 