



import { WorkOrder, Priority, Status, Asset, WorkType, WorkOrderTask, WorkOrderPart, Company, Location, System, EquipmentType, PMTemplate, PMTemplateDetail, InventoryPart, Tool, ToolCheckout, UserProfile } from "../types";
import { RawAsset, RawWorkOrder, RawCompany, RawLocation, RawSystem, RawEquipmentType, RawPMTemplate, RawPMDetail, RawWorkOrderTask, RawPart, RawWOPart, RawTool, RawToolCheckout, RawUserProfile, RawAttachment } from "../types";
import { SHEET_API_URL, SHEET_API_KEY } from "../constants";

// Helper to append API Key to URL
const getAuthUrl = () => `${SHEET_API_URL}?key=${SHEET_API_KEY}`;

// --- NORMALIZATION HELPERS ---

const normalizeCompany = (raw: RawCompany): Company => ({
    id: raw.id,
    name: raw.name,
    latitude: raw.latitude || '',
    longitude: raw.longitude || '',
    address: raw.address || '-',
    code: raw.code
});

const normalizeLocation = (raw: RawLocation): Location => ({
    id: raw.id,
    companyId: raw.company_id,
    name: raw.name
});

const normalizeSystem = (raw: RawSystem): System => ({
    id: raw.id,
    companyId: raw.company_id,
    name: raw.name,
    nameTh: raw.name_th || raw.name,
    description: raw.description || ''
});

const normalizeEquipType = (raw: RawEquipmentType): EquipmentType => ({
    id: raw.id,
    name: raw.name,
    nameTh: raw.name_th || raw.name,
    description: raw.description || ''
});

const normalizeAsset = (raw: RawAsset, locations: Location[]): Asset => {
    const loc = locations.find(l => l.id === raw.location_id);
    return {
        id: raw.id,
        assetTag: raw.asset_tag,
        name: raw.asset_name, // Correctly matched with DB dump
        category: raw.category,
        equipmentTypeId: raw.equipment_type_id,
        systemId: raw.system_id,
        locationId: raw.location_id,
        serialNumber: raw.serial_number,
        manufacturer: raw.manufacturer,
        purchaseDate: raw.purchase_date ? String(raw.purchase_date).split('T')[0] : '',
        status: raw.status as any || 'Active',
        condition: raw.condition as any || 'Good',
        imageUrl: 'https://placehold.co/400x300?text=Asset', // Placeholder for now
        companyId: loc ? loc.companyId : 'Unknown',
        model: raw.asset_name, // Fallback
        purchaseCost: raw.purchase_cost,
        warrantyEnd: raw.warranty_end ? String(raw.warranty_end).split('T')[0] : '',
        notes: raw.notes
    };
};

const normalizePMTemplate = (raw: RawPMTemplate): PMTemplate => ({
    id: raw.id,
    companyId: raw.company_id,
    systemId: raw.system_id,
    equipmentTypeId: raw.equipment_type_id,
    name: raw.name,
    frequencyType: raw.frequency_type,
    frequencyValue: Number(raw.frequency_value),
    estimatedMinutes: Number(raw.estimated_minutes),
    remarks: raw.remarks || ''
});

const normalizePMDetail = (raw: RawPMDetail): PMTemplateDetail => ({
    id: raw.id,
    pmTemplateId: raw.pm_template_id,
    stepNumber: Number(raw.step_number),
    taskDescription: raw.task_description,
    expectedInputType: (raw.expected_input_type as any) || 'Text',
    standardTextExpected: raw.standard_text_expected,
    standardMinValue: raw.standard_min_value ? Number(raw.standard_min_value) : undefined,
    standardMaxValue: raw.standard_max_value ? Number(raw.standard_max_value) : undefined,
    isCritical: Boolean(raw.is_critical)
});

const normalizeWorkOrder = (raw: RawWorkOrder, assets: Asset[], companies: Company[], attachments: RawAttachment[]): WorkOrder => {
    // Robust lookup for messy data:
    // 1. Try Exact ID Match
    let asset = assets.find(a => a.id === raw.asset_id);
    
    // 2. Try Asset Tag Match (if asset_id is actually a tag)
    if (!asset && raw.asset_id) {
        asset = assets.find(a => a.assetTag.toLowerCase() === raw.asset_id.toLowerCase());
    }
    
    // 3. Try Asset Name Match (if asset_id is a name like "Conveyor Belt")
    if (!asset && raw.asset_id) {
        asset = assets.find(a => a.name.toLowerCase() === raw.asset_id.toLowerCase());
    }

    // Determine Company: Use matched asset's company, or raw company_id, or fallback
    const company = companies.find(c => asset?.companyId === c.id) || 
                    companies.find(c => c.id === raw.company_id) || 
                    companies[0];

    let priority = Priority.MEDIUM;
    const pVal = String(raw.priority);
    if (pVal === '1') priority = Priority.LOW;
    if (pVal === '2') priority = Priority.MEDIUM;
    if (pVal === '3') priority = Priority.HIGH;
    if (pVal === '4') priority = Priority.CRITICAL;

    // Find associated images
    const images = attachments
        .filter(att => att.work_order_id === raw.id)
        .map(att => att.file_url);

    return {
        id: raw.id,
        woNumber: raw.wo_number || raw.id,
        workType: raw.work_type || WorkType.CM,
        title: raw.title,
        description: raw.description,
        status: raw.status || Status.OPEN,
        priority: priority,
        equipmentTypeId: raw.equipment_type_id || (asset ? asset.equipmentTypeId : undefined), 
        assetId: asset ? asset.id : (raw.asset_id || 'TBD'), // Use found ID or 'TBD' or the raw string if it has value
        locationId: asset ? asset.locationId : (raw.location_id || ''),
        systemId: asset ? asset.systemId : (raw.system_id || ''),
        pmTemplateId: raw.pm_template_id,
        assignedToUserId: raw.assigned_to_user_id,
        requestedByUserId: raw.requested_by_user_id,
        createdAt: raw.created_at ? String(raw.created_at).split('T')[0] : new Date().toISOString(),
        scheduledDate: raw.scheduled_date,
        completedAt: raw.completed_at,
        estimatedHours: raw.estimated_hours ? Number(raw.estimated_hours) : 0,
        // UI Helpers
        assetName: asset ? asset.name : (raw.asset_id ? `Unknown (${raw.asset_id})` : 'Unknown'),
        companyName: company ? company.name : 'Unknown',
        site: company ? company.id : 'Unknown',
        images: images,
        companyId: company ? company.id : undefined
    };
};

const normalizeTask = (raw: RawWorkOrderTask): WorkOrderTask => ({
    id: raw.id,
    workOrderId: raw.work_order_id,
    description: raw.description,
    isCompleted: Boolean(raw.is_completed),
    actualValueText: raw.actual_value_text,
    actualValueNumeric: raw.actual_value_numeric ? Number(raw.actual_value_numeric) : undefined,
    completedAt: raw.completed_at
});

const normalizePart = (raw: RawPart): InventoryPart => ({
    id: raw.id,
    name: raw.name || raw.name_en || 'Unknown Part',
    nameTh: raw.name_th,
    stockQuantity: Number(raw.stock_quantity),
    minStockLevel: Number(raw.min_stock_level),
    unitPrice: raw.unit_price ? Number(raw.unit_price) : 0,
    location: raw.location || '-',
    brand: raw.brand,
    category: raw.category
});

const normalizeWOPart = (raw: RawWOPart): WorkOrderPart => ({
    id: raw.id,
    workOrderId: raw.work_order_id,
    partId: raw.part_id,
    quantityUsed: Number(raw.quantity_used)
});

const normalizeTool = (raw: RawTool): Tool => ({
    id: raw.id,
    name: raw.name,
    status: raw.status || Status.AVAILABLE
});

const normalizeCheckout = (raw: RawToolCheckout): ToolCheckout => ({
    id: raw.id,
    toolId: raw.tool_id,
    workOrderId: raw.work_order_id,
    checkedOutByUserId: raw.checked_out_by_user_id,
    checkedOutAt: raw.checked_out_at,
    checkedInAt: raw.checked_in_at
});

const normalizeUserProfile = (raw: RawUserProfile): UserProfile => {
    return {
        id: raw.id,
        userId: raw.user_id,
        companyId: raw.company_id,
        firstName: raw.first_name,
        lastName: raw.last_name,
        role: raw.role,
        email: raw.email,
        isActive: Boolean(raw.is_active),
        password: '', 
        fullName: `${raw.first_name} ${raw.last_name}`.trim() || raw.email,
        phone: raw.phone || '' 
    };
};

// --- MAIN FETCH FUNCTION ---

export interface FullDatabase {
    companies: Company[];
    locations: Location[];
    systems: System[];
    equipmentTypes: EquipmentType[];
    assets: Asset[];
    pmTemplates: PMTemplate[];
    pmDetails: PMTemplateDetail[];
    workOrders: WorkOrder[];
    tasks: WorkOrderTask[];
    parts: InventoryPart[];
    partsUsed: WorkOrderPart[];
    tools: Tool[];
    checkouts: ToolCheckout[];
    users: UserProfile[];
}

export const fetchFullDatabase = async (): Promise<FullDatabase | null> => {
    try {
        // Ensure API Key is present in query parameters
        const response = await fetch(`${getAuthUrl()}&t=${Date.now()}`);
        
        if (!response.ok) {
             console.error("API Response Status:", response.status);
             throw new Error("Network response was not ok");
        }
        const data = await response.json();

        const companies = (data['Companies'] || []).map(normalizeCompany);
        const locations = (data['Locations'] || []).map(normalizeLocation);
        const systems = (data['Systems'] || []).map(normalizeSystem);
        const eqTypes = (data['Equipment_Types'] || []).map(normalizeEquipType);
        
        const assets = (data['Assets'] || []).map((r: RawAsset) => normalizeAsset(r, locations));
        const pmTemplates = (data['PM_Templates'] || []).map(normalizePMTemplate);
        const pmDetails = (data['PM_Template_Details'] || []).map(normalizePMDetail);
        const attachments = (data['Work_Order_Attachments'] || []) as RawAttachment[];
        
        const workOrders = (data['Work_Orders'] || []).map((r: RawWorkOrder) => normalizeWorkOrder(r, assets, companies, attachments));
        
        const tasks = (data['Work_Order_Tasks'] || []).map(normalizeTask);
        const parts = (data['Parts'] || []).map(normalizePart);
        const partsUsed = (data['Work_Order_Parts'] || []).map(normalizeWOPart);
        const tools = (data['Tools'] || []).map(normalizeTool);
        const checkouts = (data['Tool_Checkouts'] || []).map(normalizeCheckout);
        const users = (data['User_Profiles'] || []).map(normalizeUserProfile);

        return {
            companies, locations, systems, equipmentTypes: eqTypes,
            assets, pmTemplates, pmDetails, workOrders,
            tasks, parts, partsUsed, tools, checkouts, users
        };

    } catch (error) {
        console.error("Failed to fetch DB:", error);
        throw error; 
    }
};

// --- ACTIONS ---

export const authenticateUser = async (identifier: string, pass: string): Promise<UserProfile | null> => {
    try {
        const payload = {
            action: 'authenticateUser',
            payload: { identifier, pass }
        };

        // Append API Key to POST URL
        const response = await fetch(getAuthUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        
        if (result.status === 'success' && result.result) {
            return normalizeUserProfile(result.result);
        } else if (result.status === 'error') {
            throw new Error(result.message);
        }
        return null;
    } catch (error) {
        console.error("Auth Error:", error);
        throw error;
    }
};

export const uploadImageToDrive = async (base64Data: string, fileName: string, workOrderId: string): Promise<string | null> => {
    try {
        // Remove Data URI prefix if present (e.g. "data:image/jpeg;base64,")
        const cleanBase64 = base64Data.includes('base64,') 
            ? base64Data.split('base64,')[1] 
            : base64Data;

        const payload = {
            action: 'uploadImage',
            payload: {
                workOrderId: workOrderId,
                fileName: fileName,
                mimeType: 'image/jpeg',
                imageBase64: cleanBase64
            }
        };

        // Append API Key to POST URL
        const response = await fetch(getAuthUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Network error');
        
        const result = await response.json();
        if (result.status === 'success' && result.result.url) {
            return result.result.url;
        }
        return null;
    } catch (error) {
        console.error("Image upload failed:", error);
        return null;
    }
};

export const createWorkOrder = async (wo: WorkOrder): Promise<{ id: string, woNumber: string }> => {
    try {
        const payload = {
            action: 'createWorkOrder',
            payload: { workOrder: wo }
        };

        // Append API Key to POST URL
        const response = await fetch(getAuthUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Network error during creation');
        
        const result = await response.json();
        if (result.status === 'success') {
            return result.result;
        } else {
            console.error("Server Error:", result.message);
            throw new Error(result.message || "Unknown server error");
        }
    } catch (error) {
        console.error("Create WO failed:", error);
        throw error;
    }
};

export const updateWorkOrder = async (
  wo: WorkOrder, 
  tasks: WorkOrderTask[], 
  parts: WorkOrderPart[]
): Promise<boolean> => {
  try {
    const payload = {
        action: 'updateWorkOrder',
        payload: {
            workOrder: wo,
            tasks: tasks,
            parts: parts
        }
    };

    // Append API Key to POST URL
    const response = await fetch(getAuthUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' }, 
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) return false;
    
    const result = await response.json();
    return result.status === 'success';
    
  } catch (e) {
      console.error("Save failed:", e);
      return false;
  }
};

export const deleteWorkOrder = async (id: string): Promise<boolean> => {
    try {
        const payload = {
            action: 'deleteWorkOrder',
            payload: { id }
        };

        // Append API Key to POST URL
        const response = await fetch(getAuthUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Network error during deletion');
        const result = await response.json();
        return result.status === 'success';
    } catch (error) {
        console.error("Delete failed:", error);
        return false;
    }
};

// --- INVENTORY ACTIONS ---

export const createPart = async (part: InventoryPart): Promise<boolean> => {
    try {
        const payload = {
            action: 'createPart',
            payload: { part }
        };

        const response = await fetch(getAuthUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Network error during part creation');
        const result = await response.json();
        return result.status === 'success';
    } catch (error) {
        console.error("Create part failed:", error);
        return false;
    }
};

export const updatePart = async (part: InventoryPart): Promise<boolean> => {
    try {
        const payload = {
            action: 'updatePart',
            payload: { part }
        };

        const response = await fetch(getAuthUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Network error during part update');
        const result = await response.json();
        return result.status === 'success';
    } catch (error) {
        console.error("Update part failed:", error);
        return false;
    }
};

export const deletePart = async (id: string): Promise<boolean> => {
    try {
        const payload = {
            action: 'deletePart',
            payload: { id }
        };

        const response = await fetch(getAuthUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Network error during part deletion');
        const result = await response.json();
        return result.status === 'success';
    } catch (error) {
        console.error("Delete part failed:", error);
        return false;
    }
};
