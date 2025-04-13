import { Document as BaseDocument, IDocument } from "../common/document";

/**
 * Re-export the common document interface
 */
export { IDocument };

/**
 * SQLite document implementation
 * Extends the base document with SQLite specific functionality
 */
export class Document extends BaseDocument {
  /**
   * Create a new document
   * @param data Initial data
   */
  constructor(data: Partial<IDocument> = {}) {
    super(data);
  }
}
