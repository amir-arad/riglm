 # Coding Standards                                                                                          
                                                                                                                                                          
  ## Principle                                                                                                                                            
                                                                                                                                                          
  **Each file encapsulates a complete subdomain, not a coding construct.**                                                                                
                                                                                                                                                          
  Files should be organized by *what they do* (subdomain), not by *what they are* (code type).                                                            
                                                                                                                                                          
  ## Prohibited Patterns                                                                                                                                  
                                                                                                                                                          
  | Pattern | Why It's Problematic |                                                                                                                      
  |---------|---------------------|                                                                                                                       
  | `index.ts` (barrel) | Obscures dependencies, encourages circular imports, adds indirection without value |                                            
  | `types.ts` | Scatters related types away from their logic; types belong with their domain |                                                           
  | `utils.ts` / `helpers.ts` | Becomes a dumping ground; utilities should live in their relevant subdomain |                                             
  | `constants.ts` | Same issue; constants belong with the code that uses them |                                                                          
                                                                                                                                                          
  ## Required Pattern                                                                                                                                     
                                                                                                                                                          
  Each file should:                                                                                                                                       
  1. **Own a single subdomain** of its parent folder's domain                                                                                             
  2. **Contain all related constructs** (types, schemas, classes, functions, constants)                                                                   
  3. **Be independently importable** without barrel indirection                                                                                           
                                                                                                                                                          
  ## Example: Domain Layer                                                                                                                                
                                                                                                                                                          
  ```                                                                                                                                                     
  src/domain/                                                                                                                                             
  ├── config-resolver.ts   # Config types + schemas + ConfigResolver class + validateConfig()                                                             
  ├── tool-aggregator.ts   # Tool types + ToolAggregator class                                                                                            
  ├── filter-engine.ts     # FilterEngine class (imports Filters from config-resolver)                                                                    
  ```                                                                                                                                                     

  **Not:**                                                                                                                                                
  ```
  src/domain/                                                                                                                                             
  ├── index.ts             # Re-exports everything (barrel)
  ├── types.ts             # All types dumped here                                                                                                        
  ├── config-resolver.ts   # Just the class
  ├── filter-engine.ts     # Just the class
  ├── error.ts             # ApiError class
  ```                                                                                                                                                     
                                                                                                                                                          
  ## Import Implications                                                                                                                                  
                                                                                                                                                          
  - Import directly from the subdomain file: `import { Config, validateConfig } from "./config-resolver"`                                                 
  - Never import from barrel: ~~`import { Config } from "./domain"`~~                                                                                     
  - Cross-subdomain imports are explicit and traceable                                                                                                    
                                                                                                                                                          
  ## Rationale                                                                                                                                            
                                                                                                                                                          
  1. **Cohesion**: Related code stays together                                                                                                            
  2. **Discoverability**: Find types where they're used                                                                                                   
  3. **Dependency clarity**: Import paths reveal actual dependencies                                                                                      
  4. **Refactoring safety**: Moving a subdomain = moving one file                                                                                         
                                                                                                                                                          
                                                                             