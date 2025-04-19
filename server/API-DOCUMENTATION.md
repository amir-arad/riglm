# In-Memory Database API Documentation

This document provides detailed API documentation for the key classes and interfaces in the in-memory database implementation.

## Table of Contents

- [InMemoryDatabase](#inmemorydatabase)
- [Document and IDocument](#document-and-idocument)
- [InMemoryModel](#inmemorymodel)
- [Schema Validation](#schema-validation)
- [Entity Registry](#entity-registry)

## InMemoryDatabase

The `InMemoryDatabase` class is the core storage engine for the in-memory database implementation. It uses a singleton pattern to ensure a single instance is used throughout the application.

### Class Definition

```typescript
class InMemoryDatabase {
  private static instance: InMemoryDatabase;
  private entities: Map<string, Map<string, any>> = new Map();
  private idCounters: Map<string, number> = new Map();
  
  private constructor() {}
  
  static getInstance(): InMemoryDatabase;
  getCollection(entityName: string): Map<string, any>;
  generateId(entityName: string): string;
  clearAll(): void;
  dump(): Record<string, any[]>;
}
```

### API Methods

#### `static getInstance()`

Returns the singleton instance of the InMemoryDatabase.

- **Returns:** The InMemoryDatabase instance
- **Example:**
  ```typescript
  const db = InMemoryDatabase.getInstance();
  ```

#### `getCollection(entityName: string)`

Gets or creates a collection (Map) for the specified entity name.

- **Parameters:**
  - `entityName`: The name of the entity/collection
- **Returns:** A Map containing the documents for this entity type
- **Example:**
  ```typescript
  const usersCollection = db.getCollection('User');
  ```

#### `generateId(entityName: string)`

Generates a unique ID for a document in the specified collection.

- **Parameters:**
  - `entityName`: The name of the entity/collection
- **Returns:** A string ID in the format `entityName_counter`
- **Example:**
  ```typescript
  const newId = db.generateId('Product'); // Returns "Product_1"
  ```

#### `clearAll()`

Clears all data from the database. Useful for testing.

- **Example:**
  ```typescript
  db.clearAll();
  ```

#### `dump()`

Dumps all database contents for debugging.

- **Returns:** An object with entity names as keys and arrays of documents as values
- **Example:**
  ```typescript
  const dbContents = db.dump();
  console.log(dbContents);
  ```

## Document and IDocument

The `IDocument` interface and `Document` class provide the base structure for all documents stored in the database.

### Interface Definition

```typescript
interface IDocument {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Class Definition

```typescript
class Document implements IDocument {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  
  constructor(data: Partial<IDocument> = {});
  toJSON(): any;
}
```

### Properties

- **`id`**: Unique identifier for the document
- **`createdAt`**: Timestamp of when the document was created
- **`updatedAt`**: Timestamp of when the document was last updated

### Methods

#### `constructor(data: Partial<IDocument> = {})`

Creates a new document with the provided data.

- **Parameters:**
  - `data`: Optional partial document data
- **Example:**
  ```typescript
  const doc = new Document({ id: 'custom_id' });
  ```

#### `toJSON()`

Converts the document to a plain JavaScript object for serialization.

- **Returns:** A plain object representation of the document
- **Example:**
  ```typescript
  const jsonData = doc.toJSON();
  ```

## InMemoryModel

The `InMemoryModel` class provides a MongoDB-compatible API for interacting with collections of documents.

### Class Definition

```typescript
class InMemoryModel<T extends IDocument> {
  private collection: Map<string, T>;
  private entityName: string;
  private schema: Record<string, any>;
  private documentFactory: (data: any) => T;
  
  // Query parameters
  private sortCriteria?: string;
  private limitValue?: number;
  private skipValue?: number;
  private selectedFields?: string[];
  
  constructor(
    entityName: string,
    schema: Record<string, any> = {},
    documentFactory?: (data: any) => T
  );
  
  // CRUD operations
  async find(filter: Record<string, any> = {}): Promise<T[]>;
  async findById(id: string): Promise<T | null>;
  async findOne(filter: Record<string, any> = {}): Promise<T | null>;
  async create(data: Partial<T>): Promise<T>;
  async findByIdAndUpdate(id: string, update: Partial<T>): Promise<T | null>;
  async findByIdAndDelete(id: string): Promise<T | null>;
  async deleteMany(filter: Record<string, any>): Promise<number>;
  async insertMany(data: Partial<T>[]): Promise<T[]>;
  
  // Query building (chainable)
  sort(criteria: string): this;
  limit(n: number): this;
  skip(n: number): this;
  select(fields: string): this;
  exec(): Promise<T[]>;
}
```

### Constructor

#### `constructor(entityName, schema, documentFactory)`

Creates a new model for interacting with a collection.

- **Parameters:**
  - `entityName`: The name of the entity/collection
  - `schema`: Optional schema definition object
  - `documentFactory`: Optional function to create document instances
- **Example:**
  ```typescript
  const ProductModel = new InMemoryModel<Product>(
    'Product', 
    { name: String, price: Number },
    (data) => new Product(data)
  );
  ```

### CRUD Operations

#### `find(filter)`

Finds documents matching the filter.

- **Parameters:**
  - `filter`: Object with field/value pairs to match
- **Returns:** Promise resolving to an array of matching documents
- **Example:**
  ```typescript
  const products = await ProductModel.find({ price: 19.99 });
  ```

#### `findById(id)`

Finds a document by its ID.

- **Parameters:**
  - `id`: The document ID
- **Returns:** Promise resolving to the found document or null
- **Example:**
  ```typescript
  const product = await ProductModel.findById('Product_123');
  ```

#### `findOne(filter)`

Finds the first document matching the filter.

- **Parameters:**
  - `filter`: Object with field/value pairs to match
- **Returns:** Promise resolving to the found document or null
- **Example:**
  ```typescript
  const product = await ProductModel.findOne({ name: 'Example Product' });
  ```

#### `create(data)`

Creates a new document.

- **Parameters:**
  - `data`: The document data
- **Returns:** Promise resolving to the created document
- **Example:**
  ```typescript
  const product = await ProductModel.create({ name: 'New Product', price: 29.99 });
  ```

#### `findByIdAndUpdate(id, update)`

Updates a document by ID.

- **Parameters:**
  - `id`: The document ID
  - `update`: Object with fields to update
- **Returns:** Promise resolving to the updated document or null
- **Example:**
  ```typescript
  const product = await ProductModel.findByIdAndUpdate('Product_123', { price: 39.99 });
  ```

#### `findByIdAndDelete(id)`

Deletes a document by ID.

- **Parameters:**
  - `id`: The document ID
- **Returns:** Promise resolving to the deleted document or null
- **Example:**
  ```typescript
  const deletedProduct = await ProductModel.findByIdAndDelete('Product_123');
  ```

#### `deleteMany(filter)`

Deletes multiple documents matching the filter.

- **Parameters:**
  - `filter`: Object with field/value pairs to match
- **Returns:** Promise resolving to the number of deleted documents
- **Example:**
  ```typescript
  const count = await ProductModel.deleteMany({ price: { $lt: 10 } });
  ```

#### `insertMany(data)`

Creates multiple documents.

- **Parameters:**
  - `data`: Array of document data
- **Returns:** Promise resolving to the array of created documents
- **Example:**
  ```typescript
  const products = await ProductModel.insertMany([
    { name: 'Product 1', price: 19.99 },
    { name: 'Product 2', price: 29.99 }
  ]);
  ```

### Query Building

The following methods are chainable for building complex queries:

#### `sort(criteria)`

Sorts the results.

- **Parameters:**
  - `criteria`: Sort criteria string (prefix field with `-` for descending)
- **Returns:** The model instance for chaining
- **Example:**
  ```typescript
  const products = await ProductModel.sort('-price').exec();
  ```

#### `limit(n)`

Limits the number of results.

- **Parameters:**
  - `n`: Maximum number of results to return
- **Returns:** The model instance for chaining
- **Example:**
  ```typescript
  const products = await ProductModel.limit(10).exec();
  ```

#### `skip(n)`

Skips a number of results.

- **Parameters:**
  - `n`: Number of results to skip
- **Returns:** The model instance for chaining
- **Example:**
  ```typescript
  const products = await ProductModel.skip(10).exec();
  ```

#### `select(fields)`

Selects specific fields to return.

- **Parameters:**
  - `fields`: Space-separated list of field names
- **Returns:** The model instance for chaining
- **Example:**
  ```typescript
  const products = await ProductModel.select('name price').exec();
  ```

#### `exec()`

Executes the query and returns the results.

- **Returns:** Promise resolving to an array of documents
- **Example:**
  ```typescript
  const products = await ProductModel
    .sort('-price')
    .skip(10)
    .limit(5)
    .select('name price')
    .exec();
  ```

## Schema Validation

The schema validation system provides basic validation for document fields.

### SchemaValidator Class

```typescript
class SchemaValidator {
  private schema: Record<string, any>;
  
  constructor(schema: Record<string, any>);
  validate(data: Record<string, any>): { isValid: boolean; errors: string[] };
}
```

### Methods

#### `constructor(schema)`

Creates a new schema validator.

- **Parameters:**
  - `schema`: Schema definition object
- **Example:**
  ```typescript
  const validator = new SchemaValidator({
    name: { type: String, required: true },
    price: { type: Number, min: 0 }
  });
  ```

#### `validate(data)`

Validates data against the schema.

- **Parameters:**
  - `data`: The data to validate
- **Returns:** Object with validation result and errors
- **Example:**
  ```typescript
  const { isValid, errors } = validator.validate({
    name: 'Product',
    price: -10
  });
  // isValid: false
  // errors: ['price must be at least 0']
  ```

## Entity Registry

The Entity Registry maintains a registry of entity models and provides methods for creating and retrieving them.

### Class Definition

```typescript
class EntityRegistry {
  private static registry: Map<string, InMemoryModel<IEntity>> = new Map();
  
  static getOrCreate(
    entityName: string,
    schemaDefinition: Record<string, any> = {}
  ): InMemoryModel<IEntity>;
  
  static getAll(): Map<string, InMemoryModel<IEntity>>;
  static exists(entityName: string): boolean;
}
```

### Methods

#### `static getOrCreate(entityName, schemaDefinition)`

Gets an existing entity model or creates a new one.

- **Parameters:**
  - `entityName`: The name of the entity
  - `schemaDefinition`: Optional schema definition
- **Returns:** The entity model
- **Example:**
  ```typescript
  const ProductModel = EntityRegistry.getOrCreate('Product', {
    name: { type: String, required: true },
    price: { type: Number, min: 0 }
  });
  ```

#### `static getAll()`

Gets all registered entity models.

- **Returns:** Map of entity names to models
- **Example:**
  ```typescript
  const allModels = EntityRegistry.getAll();
  console.log(Array.from(allModels.keys())); // ['User', 'Product', ...]
  ```

#### `static exists(entityName)`

Checks if an entity model exists.

- **Parameters:**
  - `entityName`: The name of the entity
- **Returns:** Boolean indicating if the entity exists
- **Example:**
  ```typescript
  const exists = EntityRegistry.exists('Product');