
import React, { useState, useRef } from 'react';
import { Asset, Priority, Status, WorkOrder, Company, WorkType } from '../types';
import { Upload, Loader2, ImageIcon } from 'lucide-react';
import { uploadImageToDrive, createWorkOrder } from '../services/sheetService';
import { ToastType } from '../components/Toast';

interface CreateTicketProps {
  companies: Company[];
  assets: Asset[];
  onCreate: (ticket: WorkOrder) => void;
  onCancel: () => void;
  onShowToast?: (title: string, message: string, type: ToastType) => void;
}

export const CreateTicket: React.FC<CreateTicketProps> = ({ companies, assets, onCreate, onCancel, onShowToast }) => {
  const [selectedCompany, setSelectedCompany] = useState<string>(companies[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredAssets = assets.filter(a => a.companyId === selectedCompany);

  const triggerToast = (title: string, msg: string, type: ToastType) => {
      if (onShowToast) onShowToast(title, msg, type);
      else alert(`${title}: ${msg}`);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setPreviewImage(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) {
      triggerToast("Validation Error", "Please select an asset.", "error");
      return;
    }
    setIsSubmitting(true);
    setUploadStatus('Creating ticket...');

    try {
        // 1. Create Work Order Object with a Temporary ID
        const assetDetails = assets.find(a => a.id === selectedAsset);
        
        const tempTicket: WorkOrder = {
            id: `WO-TEMP-${Date.now()}`,
            woNumber: `WO-TEMP-${Date.now()}`,
            workType: WorkType.CM,
            title,
            description: description,
            assetId: selectedAsset,
            companyId: selectedCompany,
            locationId: assetDetails?.locationId || '',
            systemId: assetDetails?.systemId || '',
            priority,
            status: Status.OPEN,
            createdAt: new Date().toISOString(),
            images: []
        };

        // 2. Call API to get the real ID
        const result = await createWorkOrder(tempTicket);
        if (!result || !result.id) {
          throw new Error("Failed to get a valid ID from the server.");
        }
        
        const finalId = result.id;
        let imageUrl = '';

        // 3. Upload Image if it exists
        if (previewImage) {
            setUploadStatus('Uploading image to Drive...');
            const base64Data = previewImage.split(',')[1];
            const fileName = `wo_img_${Date.now()}.jpg`;
            const uploadedUrl = await uploadImageToDrive(base64Data, fileName, finalId);
            if (!uploadedUrl) {
                console.warn("Image upload failed, proceeding without image url");
                triggerToast("Image Upload Failed", "Ticket created but image failed to upload.", "info");
            } else {
                 imageUrl = uploadedUrl;
            }
        }

        // 4. Create the final ticket object with the REAL server ID
        const finalTicket: WorkOrder = {
          ...tempTicket,
          id: finalId,
          woNumber: result.woNumber,
          images: imageUrl ? [imageUrl] : []
        };

        // 5. Pass the final, correct ticket to the parent for state update
        onCreate(finalTicket);

    } catch (error) {
        console.error("Creation failed", error);
        triggerToast("Submission Failed", "Failed to create ticket. Please check console.", "error");
    } finally {
        setIsSubmitting(false);
        setUploadStatus('');
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-fade-in">
      <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Create New Work Order</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Image Upload Section */}
        <div className="bg-slate-50 p-6 rounded-xl border-2 border-dashed border-slate-300 text-center relative group hover:border-blue-400 transition-colors">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isSubmitting}
          />
          {previewImage ? (
            <div className="relative h-48 w-full flex justify-center">
              <img src={previewImage} alt="Preview" className="h-full object-contain rounded-lg" />
            </div>
          ) : (
            <div className="flex flex-col items-center text-slate-500">
              <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                <ImageIcon size={24} className="text-blue-500" />
              </div>
              <p className="font-medium text-slate-700">Click to attach photo</p>
              <p className="text-xs mt-1">Upload evidence (Optional)</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
            <select 
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedCompany}
              onChange={(e) => {
                  setSelectedCompany(e.target.value);
                  setSelectedAsset(''); // Reset asset when company changes
              }}
              disabled={isSubmitting}
            >
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Asset</label>
            <select 
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              required
              disabled={isSubmitting}
            >
              <option value="">Select Asset</option>
              {filteredAssets.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Issue Title</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g., Hydraulic Leak on Main Press"
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Detailed Description</label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-32"
            placeholder="Describe the problem, noise, smell, or error code..."
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Priority Level</label>
          <div className="flex gap-3">
            {Object.values(Priority).map((p) => (
              <button
                key={p}
                type="button"
                disabled={isSubmitting}
                onClick={() => setPriority(p)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all
                  ${priority === p 
                    ? 'border-transparent ring-2 ring-offset-1 ring-blue-500 ' + (p === Priority.CRITICAL ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800')
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button 
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={isSubmitting || !selectedAsset}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-200 transition-all flex items-center gap-2 disabled:opacity-70"
          >
            {isSubmitting ? (
                <>
                    <Loader2 className="animate-spin" size={18} />
                    {uploadStatus || 'Saving...'}
                </>
            ) : (
                <>
                    <Upload size={18} />
                    Create Ticket
                </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
