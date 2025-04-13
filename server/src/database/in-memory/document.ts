import { Document as BaseDocument, IDocument } from "../common/document";

/**
 * Re-export the common document interface
 */
export { IDocument };

/**
 * In-memory document implementation
 * Extends the base document with in-memory specific functionality
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
