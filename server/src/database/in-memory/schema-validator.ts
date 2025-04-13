/**
 * Schema validator for in-memory models
 * Provides basic schema validation 
 */
export class SchemaValidator {
  private schema: Record<string, SchemaField>;
  
  /**
   * Create a new schema validator
   * @param schema Schema definition
   */
  constructor(schema: Record<string, any>) {
    this.schema = this.parseSchema(schema);
  }
  
  /**
   * Validate data against schema
   * @param data Data to validate
   * @returns Validation result
   */
  validate(data: Record<string, any>): ValidationResult {
    const errors: ValidationError[] = [];
    const validatedData: Record<string, any> = {};
    
    // Check required fields
    for (const [fieldName, field] of Object.entries(this.schema)) {
      if (field.required && (data[fieldName] === undefined || data[fieldName] === null)) {
        errors.push({
          field: fieldName,
          message: `Field '${fieldName}' is required`,
        });
        continue;
      }
      
      // Skip validation if field is not present and not required
      if (data[fieldName] === undefined || data[fieldName] === null) {
        // Apply default value if defined
        if (field.default !== undefined) {
          const defaultValue = typeof field.default === 'function' 
            ? field.default() 
            : field.default;
          validatedData[fieldName] = defaultValue;
        }
        continue;
      }
      
      // Validate type
      if (field.type && !this.validateType(data[fieldName], field.type)) {
        errors.push({
          field: fieldName,
          message: `Field '${fieldName}' must be of type ${field.type.name}`,
        });
        continue;
      }
      
      // Validate enum
      if (field.enum && !field.enum.includes(data[fieldName])) {
        errors.push({
          field: fieldName,
          message: `Field '${fieldName}' must be one of [${field.enum.join(', ')}]`,
        });
        continue;
      }
      
      // Validate min/max for numbers
      if (typeof data[fieldName] === 'number') {
        if (field.min !== undefined && data[fieldName] < field.min) {
          errors.push({
            field: fieldName,
            message: `Field '${fieldName}' must be at least ${field.min}`,
          });
          continue;
        }
        
        if (field.max !== undefined && data[fieldName] > field.max) {
          errors.push({
            field: fieldName,
            message: `Field '${fieldName}' must be at most ${field.max}`,
          });
          continue;
        }
      }
      
      // Validate minLength/maxLength for strings
      if (typeof data[fieldName] === 'string') {
        if (field.minLength !== undefined && data[fieldName].length < field.minLength) {
          errors.push({
            field: fieldName,
            message: `Field '${fieldName}' must be at least ${field.minLength} characters long`,
          });
          continue;
        }
        
        if (field.maxLength !== undefined && data[fieldName].length > field.maxLength) {
          errors.push({
            field: fieldName,
            message: `Field '${fieldName}' must be at most ${field.maxLength} characters long`,
          });
          continue;
        }
      }
      
      // Apply transformations
      let value = data[fieldName];
      
      // Apply trim for strings
      if (typeof value === 'string' && field.trim) {
        value = value.trim();
      }
      
      // Apply lowercase for strings
      if (typeof value === 'string' && field.lowercase) {
        value = value.toLowerCase();
      }
      
      // Apply uppercase for strings
      if (typeof value === 'string' && field.uppercase) {
        value = value.toUpperCase();
      }
      
      // Add validated field to result
      validatedData[fieldName] = value;
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      data: validatedData,
    };
  }
  
  /**
   * Parse schema definition
   * @param schema Schema definition
   * @returns Parsed schema
   */
  private parseSchema(schema: Record<string, any>): Record<string, SchemaField> {
    const parsedSchema: Record<string, SchemaField> = {};
    
    for (const [fieldName, fieldDef] of Object.entries(schema)) {
      if (typeof fieldDef === 'function') {
        // Simple type definition
        parsedSchema[fieldName] = {
          type: fieldDef,
        };
      } else if (typeof fieldDef === 'object') {
        // Complex field definition
        parsedSchema[fieldName] = fieldDef as SchemaField;
      }
    }
    
    return parsedSchema;
  }
  
  /**
   * Validate type of a value
   * @param value Value to validate
   * @param type Expected type
   * @returns Whether the value is of the expected type
   */
  private validateType(value: any, type: any): boolean {
    // Handle primitive types
    if (type === String) {
      return typeof value === 'string';
    }
    
    if (type === Number) {
      return typeof value === 'number';
    }
    
    if (type === Boolean) {
      return typeof value === 'boolean';
    }
    
    if (type === Date) {
      return value instanceof Date;
    }
    
    // Handle arrays
    if (Array.isArray(type)) {
      if (!Array.isArray(value)) {
        return false;
      }
      
      // Validate array elements if type is specified
      if (type.length > 0) {
        const elementType = type[0];
        return value.every(element => this.validateType(element, elementType));
      }
      
      return true;
    }
    
    // Handle objects
    if (type === Object) {
      return typeof value === 'object' && value !== null && !(value instanceof Date);
    }
    
    // Handle custom types
    if (typeof type === 'function') {
      return value instanceof type;
    }
    
    return false;
  }
}

/**
 * Schema field definition
 */
export interface SchemaField {
  type?: any;
  required?: boolean;
  default?: any;
  enum?: any[];
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  trim?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  data: Record<string, any>;
}