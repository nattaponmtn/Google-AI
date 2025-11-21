

export enum Priority {
  LOW = '1', 
  MEDIUM = '2', 
  HIGH = '3', 
  CRITICAL = '4' 
}

export enum Status {
  OPEN = 'Open',
  IN_PROGRESS = 'In Progress',
  WAITING_PARTS = 'Waiting for Parts',
  COMPLETED = 'Completed',
  SCHEDULED = 'Scheduled',
  PENDING = 'Pending',
  
  AVAILABLE = 'Available',
  CHECKED_OUT = 'Checked Out',
  MAINTENANCE = 'Maintenance',
  LOST = 'Lost'
}

export enum WorkType {
  CM = 'Corrective (CM)',
  PM = 'Preventive (PM)',
  EMERGENCY = 'Emergency',
  INSPECTION = 'Inspection',
  CALIBRATION = 'Calibration'
}

// --- Raw Interfaces (Snake Case from Google Sheets) ---
export interface RawCompany { 
  id: string; name: string; latitude?: string; longitude?: string; 
  code?: string; created_at?: string; email?: string; phone?: string; 
  address?: string; is_active?: boolean; parent_company_id?: string; 
}
export interface RawLocation { id: string; company_id: string; name: string; }
export interface RawStorageLocation { id: string; name: string; } // New Storage Location
export interface RawSystem { id: string; company_id: string; name: string; name_th?: string; description?: string; }
export interface RawEquipmentType { id: string; name: string; name_th?: string; description?: string; company_id?: string; }
export interface RawAsset { 
  id: string; asset_tag: string; asset_name: string; category: string; 
  equipment_type_id: string; system_id: string; location_id: string; 
  serial_number: string; manufacturer: string; purchase_date: string; 
  purchase_cost?: number; warranty_end?: string; status: string; 
  condition: string; responsible_person_id?: string; notes?: string;
}
export interface RawPMTemplate { 
  id: string; company_id: string; system_id: string; equipment_type_id: string; 
  name: string; frequency_type: string; frequency_value: number; 
  estimated_minutes: number; remarks?: string; 
}
export interface RawPMDetail {
  id: string; pm_template_id: string; step_number: number; task_description: string;
  expected_input_type: string; standard_text_expected?: string; 
  standard_min_value?: number; standard_max_value?: number; is_critical?: boolean;
  remarks?: string;
}
export interface RawWorkOrder {
  id: string; wo_number: string; work_type: string; title: string; description: string;
  status: string; priority: number | string; 
  equipment_type_id?: string;
  asset_id: string; location_id: string;
  system_id: string; pm_template_id?: string; created_at: string; 
  scheduled_date?: string; completed_at?: string; estimated_hours?: number;
  assigned_to_user_id?: string; requested_by_user_id?: string;
  assigned_to?: string; requested_by?: string;
  company_id?: string;
}
export interface RawWorkOrderTask {
  id: string; work_order_id: string; description: string; is_completed: boolean;
  actual_value_text?: string; actual_value_numeric?: number; completed_at?: string;
}
export interface RawPart { 
  id: string; 
  name_en: string; // Changed from 'name' to match backend update
  name_th?: string; 
  stock_quantity: number; 
  min_stock_level: number; 
  unit_price?: number;
  location?: string;
  brand?: string;
  category?: string;
}
export interface RawWOPart { id: string; work_order_id: string; part_id: string; quantity_used: number; }
export interface RawTool { id: string; name: string; status: string; }
export interface RawToolCheckout { id: string; tool_id: string; work_order_id: string; checked_out_by_user_id: string; checked_out_at: string; checked_in_at?: string; }
export interface RawUserProfile { 
  id: string; user_id: string; company_id: string; first_name: string; last_name: string; 
  role: string; email: string; is_active: boolean; password?: string; phone?: string;
}
export interface RawAttachment {
  id: string; work_order_id: string; file_name: string; file_url: string; created_at: string;
}

// --- App Interfaces (Camel Case) ---

export interface Company {
  id: string;
  name: string;
  latitude: string;
  longitude: string;
  address: string;
  code?: string;
}

export interface Location {
  id: string;
  companyId: string;
  name: string;
}

export interface StorageLocation {
  id: string;
  name: string;
}

export interface System {
  id: string;
  companyId: string;
  name: string;
  nameTh: string;
  description: string;
}

export interface EquipmentType {
  id: string;
  name: string;
  nameTh: string;
  description: string;
}

export interface Asset {
  id: string;
  assetTag: string;
  name: string;
  category: string;
  equipmentTypeId: string;
  systemId: string;
  locationId: string;
  serialNumber: string;
  manufacturer: string;
  purchaseDate: string;
  status: 'Active' | 'Inactive' | 'Maintenance' | 'Disposed';
  condition: 'Good' | 'Fair' | 'Poor' | 'Excellent';
  imageUrl?: string;
  companyId?: string;
  model?: string;
  purchaseCost?: number;
  warrantyEnd?: string;
  notes?: string;
}

export interface PMTemplate {
  id: string;
  companyId: string;
  systemId: string;
  equipmentTypeId: string;
  name: string;
  frequencyType: string; 
  frequencyValue: number;
  estimatedMinutes: number;
  remarks: string;
}

export interface PMTemplateDetail {
  id: string;
  pmTemplateId: string;
  stepNumber: number;
  taskDescription: string;
  expectedInputType: 'Text' | 'Number' | 'Boolean';
  standardTextExpected?: string;
  standardMinValue?: number;
  standardMaxValue?: number;
  isCritical: boolean;
}

export interface WorkOrder {
  id: string;
  woNumber: string;
  workType: WorkType | string;
  title: string;
  description: string;
  status: Status | string;
  priority: Priority | string;
  equipmentTypeId?: string;
  assetId: string;
  locationId: string;
  systemId: string;
  pmTemplateId?: string;
  assignedToUserId?: string;
  requestedByUserId?: string;
  createdAt: string;
  scheduledDate?: string;
  completedAt?: string;
  estimatedHours?: number;
  
  assetName?: string;
  locationName?: string;
  companyName?: string;
  images?: string[];
  site?: string;
  companyId?: string;
  requestor?: string;
}

export interface WorkOrderTask {
  id: string;
  workOrderId: string;
  description: string;
  isCompleted: boolean;
  actualValueText?: string;
  actualValueNumeric?: number;
  completedAt?: string;
  resultStatus?: 'Normal' | 'Monitor' | 'Abnormal'; // Added for UI selection
}

export interface InventoryPart {
  id: string;
  name: string; // Matches name_en
  nameTh?: string;
  stockQuantity: number;
  minStockLevel: number;
  unitPrice: number;
  location: string;
  brand?: string;
  category?: string;
}

export interface WorkOrderPart {
  id: string;
  workOrderId: string;
  partId: string;
  quantityUsed: number;
}

export interface Tool {
  id: string;
  name: string;
  status: Status | string;
}

export interface ToolCheckout {
  id: string;
  toolId: string;
  workOrderId: string;
  checkedOutByUserId: string;
  checkedOutAt: string;
  checkedInAt?: string;
}

export interface PartRequisition {
  id: string;
  reqNumber: string;
  description: string;
  status: string; 
  priority: Priority | string;
  requestedBy: string;
  workOrderId: string;
  totalEstimatedCost: number;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  companyId: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  isActive: boolean;
  password?: string;
  fullName: string;
  phone?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
  groundingUrls?: string[];
}
