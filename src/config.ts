export const CONFIG = {
  
  GAME_WIDTH: 1024,
  GAME_HEIGHT: 768,
  
  
  TIMER: {
    INITIAL_TIME: 35.0,           
    ASSIST_MODE_TIME: 50.0,        
    LOW_TIME_THRESHOLD: 5.0,       
    TICK_RATE: 0.1,                
  },
  
  
  TASK: {
    PROXIMITY_RADIUS: 48,          
    COMPLETION_DELAY: 1.0,         
    MINIGAME_DURATION: 8.0,        
    RESET_TIMER_ON_COMPLETE: false, 
  },
  
  
  CHARACTER: {
    SPEED: 150,                    
    SIZE: 40,                      
    SCALE: 0.3,                    
    NAMES: ['Alex', 'Sam', 'Jordan'], 
  },
  
  
  COLORS: {
    CHAR_1: 0x00CED1,             
    CHAR_2: 0xFF8C00,             
    CHAR_3: 0xFF00FF,             
    TASK: 0x00FF00,               
    UI_BACKGROUND: 0x000000,
    UI_TEXT: 0xFFFFFF,
    WARNING: 0xFF0000,
    SUCCESS: 0x00FF00,
  },
  
  
  UI: {
    TIMER_RADIUS: 10,           
    TIMER_LINE_WIDTH: 2,         
    MINIMAP_SIZE: 150,            
    MINIMAP_SCALE: 0.15,          
    HUD_PADDING: 20,              
  },
  
  
  MAP: {
    TILE_SIZE: 32,
    WIDTH: 32,                    
    HEIGHT: 24,                   
    ZONE_COUNT: 3,                
    ZONE_SPACING: 2,              
  },
  
  
  AUDIO: {
    MASTER_VOLUME: 0.7,
    SFX_VOLUME: 0.8,
    WARNING_VOLUME: 0.6,
  },
  
  
  STORAGE: {
    CHECKPOINT: 'tripoint_checkpoint',
    SETTINGS: 'tripoint_settings',
  },
  
  
  WIN: {
    REQUIRED_TASKS: 12,       
    ENABLED: true,         
  },
} as const;


export const SPAWN_POSITIONS = [
  { x: 5, y: 12, id: 1, zone: 0 },   
  { x: 5, y: 12, id: 2, zone: 1 },   
  { x: 5, y: 12, id: 3, zone: 2 },   
];



export const TASK_POSITIONS = [
  { x: 10, y: 8, zone: 0, type: 'wire' as const },
  { x: 20, y: 10, zone: 0, type: 'asteroid' as const },
  { x: 15, y: 18, zone: 0, type: 'dino' as const },
  { x: 25, y: 14, zone: 0, type: 'card' as const },

  { x: 8, y: 6, zone: 1, type: 'card' as const },
  { x: 18, y: 8, zone: 1, type: 'golf' as const },
  { x: 12, y: 14, zone: 1, type: 'telescope' as const },
  { x: 22, y: 18, zone: 1, type: 'wire' as const },

  { x: 10, y: 10, zone: 2, type: 'dino' as const },
  { x: 20, y: 12, zone: 2, type: 'golf' as const },
  { x: 15, y: 16, zone: 2, type: 'telescope' as const },
  { x: 25, y: 8, zone: 2, type: 'asteroid' as const },
];
