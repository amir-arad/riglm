/**
 * Base document interface
 * Provides common fields for all documents
 */
export interface IDocument {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Base document implementation
 * Provides common functionality for all documents
 */
export class Document implements IDocument {
  _id: string;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Create a new document
   * @param data Initial data
   */
  constructor(data: Partial<IDocument> = {}) {
    this._id = data._id || "";
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Convert document to JSON
   * @returns JSON representation of document
   */
  toJSON(): any {
    return {
      _id: this._id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Update the document's updatedAt timestamp
   */
  touch(): void {
    this.updatedAt = new Date();
  }
}
