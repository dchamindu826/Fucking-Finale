import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Loader2, FolderOpen, Layers, BookOpen, Plus, Edit3, Trash2, ChevronRight, ChevronDown, X, ArrowLeft, GripVertical, CheckCircle, FolderPlus, Video, MonitorPlay, FileText, FileSignature, ExternalLink, Ban, Power, Building2, UserPlus, CreditCard, Send, UploadCloud, Users, MessageSquare } from 'lucide-react';
import api from '../../api/axios';

export default function ContentHub() {
  const [loading, setLoading] = useState(true);

  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = storedUser.role ? storedUser.role.toUpperCase() : 'STAFF'; 

  const isSystemAdmin = userRole === 'SYSTEM_ADMIN' || userRole === 'SYSTEM ADMIN' || userRole === 'DIRECTOR';
  const isManager = userRole === 'MANAGER' || userRole === 'ASS MANAGER' || userRole === 'ASS_MANAGER';
  const isStaff = userRole === 'COORDINATOR' || userRole === 'STAFF';

  const canManageBusiness = isSystemAdmin;
  const canManageBatches = isSystemAdmin || isManager;
  const canManageGroupsAndSubjects = isSystemAdmin || isManager;
  const canManageContent = isSystemAdmin || isManager || isStaff;

  const [viewLevel, setViewLevel] = useState(isSystemAdmin ? 'businesses' : 'batches'); 
  const [activeBusiness, setActiveBusiness] = useState(null);
  const [activeBatch, setActiveBatch] = useState(null);
  const [batchTab, setBatchTab] = useState('subjects'); 
  const [activeSubject, setActiveSubject] = useState(null);
  const [contentTab, setContentTab] = useState('live'); 

  const [businesses, setBusinesses] = useState([]);
  const [managersList, setManagersList] = useState([]);
  const [batches, setBatches] = useState([]); 
  const [uniqueSubjects, setUniqueSubjects] = useState([]);
  const [lessonGroups, setLessonGroups] = useState([]); 
  const [subjectContents, setSubjectContents] = useState([]);
  
  const [postsList, setPostsList] = useState([]); 

  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showLessonGroupModal, setShowLessonGroupModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false); 
  const [showManagePostsModal, setShowManagePostsModal] = useState(false); 
  
  const [previewData, setPreviewData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState(null);
  const [selectedLogoName, setSelectedLogoName] = useState(""); 
  
  const [selectedGroupPrices, setSelectedGroupPrices] = useState({}); 
  const [discountRules, setDiscountRules] = useState([{ courseCount: '', pricePerCourse: '' }]); 
  const [contentType, setContentType] = useState('');
  const [prefilledFolder, setPrefilledFolder] = useState('');
  
  const [selectedBatchesForContent, setSelectedBatchesForContent] = useState([]);
  const [massAssignSubjects, setMassAssignSubjects] = useState([]);
  const [openFolders, setOpenFolders] = useState({});

  const [postBizId, setPostBizId] = useState('all');
  const [postBatches, setPostBatches] = useState([]);

  useEffect(() => {
    if (postBizId === 'all' || !postBizId) { setPostBatches([]); return; }
    if (!isSystemAdmin) { setPostBatches(batches); return; }
    api.get(`/admin/batches/${postBizId}`).then(res => {
        const fetched = res.data.batches || res.data || [];
        setPostBatches(Array.isArray(fetched) ? fetched : []);
    }).catch(e => console.error(e));
  }, [postBizId, isSystemAdmin, batches]);

  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [existingInstallments, setExistingInstallments] = useState([]);
  const [editInstallmentId, setEditInstallmentId] = useState(null);
  const [installmentSubjectCount, setInstallmentSubjectCount] = useState('');
  const [installmentSteps, setInstallmentSteps] = useState([{ step: 1, amount: '', gapDays: '0' }]);

  const toggleFolder = (folderId) => setOpenFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  const addDiscountRule = () => setDiscountRules([...discountRules, { courseCount: '', pricePerCourse: '' }]);
  const removeDiscountRule = (index) => setDiscountRules(discountRules.filter((_, i) => i !== index));
  const handleDiscountRuleChange = (index, field, value) => { const newRules = [...discountRules]; newRules[index][field] = value; setDiscountRules(newRules); };
  
  const addInstallmentStep = () => setInstallmentSteps([...installmentSteps, { step: installmentSteps.length + 1, amount: '', gapDays: '30' }]);
  const removeInstallmentStep = (idx) => {
      const newSteps = installmentSteps.filter((_, i) => i !== idx);
      setInstallmentSteps(newSteps.map((s, i) => ({...s, step: i + 1})));
  };

  // 🔥 FIX: Group Price Object Store Madalu Modifications 🔥
  const toggleGroupPrice = (groupId) => {
      setSelectedGroupPrices(prev => {
          if (prev[groupId] !== undefined) { const newPrices = { ...prev }; delete newPrices[groupId]; return newPrices; }
          return { ...prev, [groupId]: { price: '', deliverTute: false, tuteName: '', tuteFile: null } };
      });
  };

  const updateGroupData = (groupId, field, value) => {
      setSelectedGroupPrices(prev => ({
          ...prev,
          [groupId]: { ...prev[groupId], [field]: value }
      }));
  };

  const toggleMassAssignSubject = (subId) => setMassAssignSubjects(prev => prev.includes(subId) ? prev.filter(id => id !== subId) : [...prev, subId]);

  const extractArray = (resData) => {
      if (!resData) return [];
      if (Array.isArray(resData)) return resData;
      if (Array.isArray(resData.data)) return resData.data;
      if (Array.isArray(resData.businesses)) return resData.businesses;
      if (Array.isArray(resData.staff)) return resData.staff;
      return [];
  };

  const fetchInitialData = async () => {
      setLoading(true);
      try {
          if(isSystemAdmin) {
              try {
                  const mgrRes = await api.get('/admin/staff');
                  setManagersList(extractArray(mgrRes.data)); // Get all staff to use as lecturers too
              } catch (err) {}
              try {
                  const bizRes = await api.get('/admin/businesses'); 
                  setBusinesses(extractArray(bizRes.data));
              } catch (err) {}
          } else {
              const overviewRes = await api.get('/admin/manager/overview');
              if (overviewRes.data && overviewRes.data.business) setActiveBusiness(overviewRes.data.business);
              const batchRes = await api.get('/admin/manager/batches-full');
              setBatches(extractArray(batchRes.data));
          }
      } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { fetchInitialData(); }, []);

  const refreshBatches = async (bizId) => {
      try {
          const url = isSystemAdmin ? `/admin/batches/${bizId}` : '/admin/manager/batches-full';
          const res = await api.get(url);
          let fetchedBatches = isSystemAdmin ? (res.data.batches || res.data) : res.data;
          fetchedBatches = Array.isArray(fetchedBatches) ? fetchedBatches : [];
          setBatches(fetchedBatches);
          
          if (activeBatch) {
              const updatedBatch = fetchedBatches.find(b => b.id.toString() === activeBatch.id.toString());
              if (updatedBatch) { setActiveBatch(updatedBatch); extractUniqueSubjects(updatedBatch); }
          }
      } catch(e) { console.error(e); }
  };

  const extractUniqueSubjects = (batch) => {
      const subs = [];
      batch?.groups?.forEach(g => {
          g.courses?.forEach(c => {
              const existing = subs.find(s => s.name === c.name);
              if(!existing) { subs.push({...c, groupPrices: [{ groupId: g.id, groupName: g.name, groupType: g.type, price: c.price, deliverTute: c.deliverTute, tuteName: c.tuteName }] }); } 
              else { existing.groupPrices.push({ groupId: g.id, groupName: g.name, groupType: g.type, price: c.price, deliverTute: c.deliverTute, tuteName: c.tuteName }); }
          });
      });
      setUniqueSubjects(subs.sort((a,b) => a.itemOrder - b.itemOrder));
  };

  const fetchContents = async (subject, batch) => {
      try {
          const safeCode = subject.code || `SUB_${subject.id}`;
          const res = await api.get(`/admin/manager/get-contents?batchId=${batch.id}&courseCode=${safeCode}&courseId=${subject.id}`);
          setLessonGroups(res.data?.lessonGroups || []);
          setSubjectContents(res.data?.contents || []);
          const newOpenState = {};
          (res.data?.lessonGroups || []).forEach(f => newOpenState[f.id] = true);
          setOpenFolders(newOpenState);
      } catch (e) { toast.error("Failed to load contents"); }
  };

  const fetchPosts = async () => {
      try {
          const res = await api.get('/admin/manager/posts');
          setPostsList(res.data || []);
      } catch (e) { toast.error("Failed to load posts"); }
  };

  const handleBack = (level) => {
      setViewLevel(level);
      if(level === 'businesses') { setActiveBusiness(null); setActiveBatch(null); setActiveSubject(null); }
      if(level === 'batches') { setActiveBatch(null); setActiveSubject(null); }
      if(level === 'batch_details') { setActiveSubject(null); }
  };

  const openBusinessDetails = (biz) => { setActiveBusiness(biz); setViewLevel('batches'); refreshBatches(biz.id); };
  const openBatchDetails = (batch) => { setActiveBatch(batch); extractUniqueSubjects(batch); setViewLevel('batch_details'); setBatchTab('subjects'); };
  const openContentsView = async (subject) => { setActiveSubject(subject); setViewLevel('contents'); setLoading(true); await fetchContents(subject, activeBatch); setLoading(false); };

  const getImageUrl = (imageName) => (!imageName || imageName === 'default.png' || imageName === 'null') ? '/logo.png' : `${api.defaults.baseURL.replace('/api','')}/storage/icons/${imageName}`;
  const getPostImageUrl = (imageName) => (!imageName || imageName === 'default.png' || imageName === 'null') ? null : `${api.defaults.baseURL.replace('/api','')}/storage/posts/${imageName}`;
  
  const getManagerName = (id) => { const m = managersList.find(m => m.id.toString() === id?.toString()); return m ? `${m.firstName} ${m.lastName}` : 'Not Assigned'; };
  const getBatchStreams = () => { try { return activeBusiness?.streams ? activeBusiness.streams.split(',').map(s=>s.trim()) : []; } catch(e) { return []; } };

  const groupedSubjects = uniqueSubjects.reduce((acc, sub) => {
      if (activeBusiness?.category === 'Advance Level' || activeBusiness?.category === 'AL') {
          let subStreams = [];
          try {
              if (Array.isArray(sub.streams)) subStreams = sub.streams;
              else if (typeof sub.streams === 'string') {
                  const parsed = JSON.parse(sub.streams);
                  subStreams = Array.isArray(parsed) ? parsed : sub.streams.split(',').map(s=>s.trim());
              } else if (sub.stream) subStreams = [sub.stream];
          } catch(e) {
              if (typeof sub.streams === 'string') subStreams = sub.streams.split(',').map(s=>s.trim());
          }
          if (!Array.isArray(subStreams) || subStreams.length === 0) subStreams = ['Common Subjects'];

          subStreams.forEach(st => {
              if(!acc[st]) acc[st] = [];
              if(!acc[st].find(s => s.id === sub.id)) acc[st].push(sub);
          });
      } else {
          if(!acc['All Subjects']) acc['All Subjects'] = [];
          acc['All Subjects'].push(sub);
      }
      return acc;
  }, {});

  const getTypeInt = (tabStr) => { switch(tabStr) { case 'live': return 1; case 'recording': return 2; case 'document': return 3; case 'sPaper': return 4; case 'paper': return 5; default: return 1; } };
  const getEmbedUrl = (url) => {
      if (!url) return '';
      if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/');
      if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'youtube.com/embed/');
      if (url.includes('drive.google.com') && url.includes('/view')) return url.replace('/view', '/preview');
      return url; 
  };
  const isMatchedType = (item) => {
      const itemType = item.type ?? item.content_type ?? item.contentType;
      return itemType !== null && (parseInt(itemType) === getTypeInt(contentTab) || itemType.toString() === contentTab);
  };
  const getFolderId = (item) => { const fId = item.content_group_id ?? item.contentGroupId ?? item.folder_id; return fId ? String(fId) : null; };

  const toggleBusinessStatus = async (biz) => {
      if(!window.confirm(`Are you sure you want to ${biz.status === 1 ? 'Disable' : 'Enable'} this Business?`)) return;
      try { await api.put('/course-setup/business/toggle-status', { business_id: biz.id, status: biz.status === 1 ? 0 : 1 }); toast.success("Business Updated!"); fetchInitialData(); } catch (e) { toast.error("Failed"); }
  };

  const toggleBatchStatus = async (batch) => {
      if(!window.confirm(`Are you sure you want to ${batch.status === 1 ? 'Disable' : 'Enable'} this Batch?`)) return;
      try { await api.put('/course-setup/batch/toggle-status', { batch_id: batch.id, status: batch.status === 1 ? 0 : 1 }); toast.success("Batch Updated!"); refreshBatches(activeBusiness.id); } catch (e) { toast.error("Failed"); }
  };

  const deleteItem = async (url, payload, successMsg) => {
      if(window.confirm("Are you sure you want to delete this item?")) {
          try { 
              await api.delete(url, { data: payload }); 
              toast.success(successMsg); 
              if(viewLevel==='businesses') fetchInitialData(); else refreshBatches(activeBusiness.id); 
              if(viewLevel==='contents') fetchContents(activeSubject, activeBatch);
          } catch(e) { 
              toast.error("Error: Cannot delete. Please Deactivate it instead."); 
          }
      }
  };

  const openInstallmentModal = async () => {
      if(!activeBatch) return toast.error("Please select a batch first!");
      setInstallmentSubjectCount('');
      setInstallmentSteps([{step: 1, amount: '', gapDays: '0'}]);
      setEditInstallmentId(null);
      setShowInstallmentModal(true); 
      try {
          const res = await api.get(`/course-setup/installment/${activeBatch.id}`);
          setExistingInstallments(res.data || []);
      } catch (e) { console.error(e); }
  };

  const handleEditInstallment = (plan) => {
      setEditInstallmentId(plan.id);
      setInstallmentSubjectCount(plan.subjectCount);
      setInstallmentSteps(typeof plan.details === 'string' ? JSON.parse(plan.details) : plan.details);
  };

  const handleDeleteInstallment = async (id) => {
      if(!window.confirm("Delete this installment plan?")) return;
      try {
          await api.delete('/course-setup/installment', { data: { plan_id: id } });
          toast.success("Installment Plan Deleted!");
          setExistingInstallments(existingInstallments.filter(i => i.id.toString() !== id.toString()));
          if(editInstallmentId === id) {
              setEditInstallmentId(null);
              setInstallmentSubjectCount('');
              setInstallmentSteps([{step: 1, amount: '', gapDays: '0'}]);
          }
      } catch (e) { toast.error("Delete failed"); }
  };

  const handleInstallmentSubmit = async (e) => {
      e.preventDefault();
      try {
          if (editInstallmentId) {
              await api.put('/course-setup/installment', { plan_id: editInstallmentId, subjectCount: installmentSubjectCount, installmentsData: installmentSteps });
              toast.success("Installment Plan Updated!");
          } else {
              await api.post('/course-setup/installment', { batch_id: activeBatch.id, subjectCount: installmentSubjectCount, installmentsData: installmentSteps });
              toast.success("Installment Setup Complete!");
          }
          const res = await api.get(`/course-setup/installment/${activeBatch.id}`);
          setExistingInstallments(res.data || []);
          setEditInstallmentId(null);
          setInstallmentSubjectCount('');
          setInstallmentSteps([{step: 1, amount: '', gapDays: '0'}]);
      } catch(e) { toast.error("Failed to setup installments"); }
  };

  const handlePostSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      const formData = new FormData(e.target);
      try {
          await api.post('/admin/manager/post/create', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
          toast.success("Post Published Successfully!");
          setShowPostModal(false);
          fetchPosts(); 
      } catch (err) {
          toast.error("Failed to publish post.");
      } finally { setLoading(false); }
  };

  const openPostModal = () => {
      setPostBizId(isSystemAdmin ? 'all' : (activeBusiness?.id || 'all'));
      setShowPostModal(true);
  };

  const handleBusinessSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      if(formData.get('category') === 'Advance Level' || formData.get('category') === 'AL') {
          const streams = [];
          ['Art', 'Commerce', 'Tech', 'Bio', 'Maths'].forEach(s => { if(formData.get(`stream_${s}`)) streams.push(s); });
          formData.append('streams', streams.join(','));
      }
      formData.append('isDiscountEnabledForInstallments', formData.get('isDiscountEnabledForInstallments') ? 1 : 0);

      try {
          if(editMode) { formData.append('businessId', editData.id); await api.put('/admin/business/update', formData); } 
          else { await api.post('/course-setup/business', formData); }
          toast.success(editMode ? "Business Updated!" : "Business Created!");
          setShowBusinessModal(false); fetchInitialData(); setSelectedLogoName(""); 
      } catch(e) { toast.error("Error saving business"); }
  };

  const handleAssignManagers = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      try {
          await api.put(`/admin/businesses/${editData.id}/assign`, { head_manager_id: formData.get('head_manager'), ass_manager_id: formData.get('ass_manager') });
          toast.success("Managers Assigned!");
          setShowAssignModal(false); fetchInitialData();
      } catch(e) { toast.error("Assignment Failed"); }
  };

  const handleBatchSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      formData.append('business_id', activeBusiness.id);
      try {
          if(editMode) { formData.append('batch_id', editData.id); await api.put('/admin/batch/update', formData); } 
          else { await api.post('/course-setup/batch', formData); }
          toast.success(editMode ? "Batch Updated!" : "Batch Created!");
          setShowBatchModal(false); refreshBatches(activeBusiness.id); setSelectedLogoName("");
      } catch(e) { toast.error("Error saving batch. Backend endpoint might be missing."); }
  };

  const handleGroupSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const pType = formData.get('paymentType');
      const cleanDiscountRules = discountRules.filter(rule => rule.courseCount !== '' && rule.pricePerCourse !== '').map(rule => ({ courseCount: parseInt(rule.courseCount, 10), pricePerCourse: parseFloat(rule.pricePerCourse) }));

      const payload = { 
          group_id: editData?.id, batch_id: activeBatch.id, name: formData.get('name'), paymentType: pType, itemOrder: formData.get('itemOrder'), 
          discountRules: pType === 'Full Payment' ? cleanDiscountRules : [] 
      };
      
      try {
          if(editMode) await api.put('/course-setup/group/update', payload); 
          else await api.post('/course-setup/group', payload);
          toast.success(editMode ? "Group Updated!" : "Group Created!");
          setShowGroupModal(false); refreshBatches(activeBusiness.id);
      } catch (error) { toast.error("Action Failed"); }
  };

  // 🔥 FIX: Lecturer, Tute Data, FormData modifications 🔥
  const handleCourseSubmit = async (e) => {
      e.preventDefault();
      const keys = Object.keys(selectedGroupPrices);
      if (keys.length === 0) return toast.error("Please tick at least one group and enter a price!");
      
      const formData = new FormData(e.target);
      const selectedStreams = formData.getAll('streams');
      const excludeDiscount = formData.get('isDiscountExcluded') === 'true';

      const formattedPrices = keys.map(k => ({ 
          groupId: k, 
          price: selectedGroupPrices[k].price,
          deliverTute: selectedGroupPrices[k].deliverTute,
          tuteName: selectedGroupPrices[k].tuteName
      }));

      // Append tute image files uniquely to FormData
      keys.forEach(k => {
          if (selectedGroupPrices[k].tuteFile) {
              formData.append(`tuteCover_${k}`, selectedGroupPrices[k].tuteFile);
          }
      });

      formData.append('course_id', editData?.id || '');
      formData.append('lecturerName', formData.get('lecturerName'));
      formData.append('name', formData.get('name'));
      formData.append('code', formData.get('code'));
      formData.append('stream', selectedStreams.length > 0 ? selectedStreams[0] : null);
      formData.append('streams', JSON.stringify(selectedStreams));
      formData.append('description', formData.get('description'));
      formData.append('itemOrder', formData.get('itemOrder') || 1);
      formData.append('courseType', 1);
      formData.append('groupPricing', JSON.stringify(formattedPrices));
      formData.append('groupPrices', JSON.stringify(formattedPrices));
      formData.append('isDiscountExcluded', excludeDiscount);
      
      try {
          // Use FormData to allow file uploads
          if(editMode) { 
              formData.append('price', formattedPrices[0].price); 
              await api.put('/admin/course/update', formData, { headers: { 'Content-Type': 'multipart/form-data' }}); 
          } else { 
              await api.post('/course-setup/subject', formData, { headers: { 'Content-Type': 'multipart/form-data' }}); 
          }
          toast.success(editMode ? "Subject Updated!" : "Subject Created!");
          setShowCourseModal(false); refreshBatches(activeBusiness.id);
      } catch (error) { toast.error("Action Failed"); }
  };

  const handleLessonGroupSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const folderType = getTypeInt(contentTab); 
      const payload = { 
          contentGroupId: editData?.id, title: formData.get('title'), type: folderType, order: formData.get('order') || 1, 
          batch_id: activeBatch.id, course_code: activeSubject.code || `SUB_${activeSubject.id}`
      };

      try {
          if(editMode) await api.put('/admin/content-group/update', payload); 
          else await api.post('/admin/manager/content-group/add', payload);
          toast.success(editMode ? "Folder Updated!" : "Folder Created!");
          setShowLessonGroupModal(false); fetchContents(activeSubject, activeBatch); 
      } catch (error) { toast.error("Action Failed"); }
  };

  const handleMassAssignSubmit = async (e) => {
      e.preventDefault();
      if(!editMode && massAssignSubjects.length === 0) return toast.error("Please select at least one subject to assign this content!");
      const formData = new FormData(e.target);
      formData.append('type', contentType);
      formData.append('batch_id', activeBatch.id);

      if(!editMode) formData.append('selectedCourses', JSON.stringify(massAssignSubjects));
      if(editMode && editData?.id) formData.append('content_id', editData.id);

      try {
          if (editMode) await api.put('/admin/manager/contents/update', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
          else await api.post('/admin/manager/contents/mass-assign', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
          toast.success("Content Saved!");
          setShowContentModal(false); if(activeSubject) fetchContents(activeSubject, activeBatch); 
      } catch (error) { toast.error("Failed to process content"); }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 size={50} className="animate-spin text-blue-500" /></div>;

  return (
    <div className="w-full text-slate-200 animate-in fade-in duration-500 flex flex-col font-sans pb-4">
      
      {/* --- HEADER --- */}
      <div className="mb-8 bg-slate-800/30 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl flex flex-col gap-5 shadow-lg shrink-0">
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-400">
              {viewLevel !== 'businesses' && <button onClick={() => handleBack(viewLevel==='contents' ? 'batch_details' : viewLevel==='batch_details' ? 'batches' : 'businesses')} className="hover:text-blue-400 flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl transition-colors"><ArrowLeft size={16}/> Back</button>}
              {isSystemAdmin && <button onClick={() => handleBack('businesses')} className={`hover:text-white transition-colors ${viewLevel==='businesses' ? 'text-white font-bold' : ''}`}>Businesses</button>}
              {(viewLevel === 'batches' || viewLevel === 'batch_details' || viewLevel === 'contents') && activeBusiness && (
                  <><ChevronRight size={16} className="text-slate-600"/> <button onClick={() => handleBack('batches')} className={`hover:text-white transition-colors truncate max-w-[150px] sm:max-w-none ${viewLevel==='batches' ? 'text-white font-bold' : ''}`}>{activeBusiness.name}</button></>
              )}
              {activeBatch && (viewLevel === 'batch_details' || viewLevel === 'contents') && (
                  <><ChevronRight size={16} className="text-slate-600"/> <button onClick={() => handleBack('batch_details')} className={`hover:text-white transition-colors truncate max-w-[150px] sm:max-w-none ${viewLevel==='batch_details' ? 'text-white font-bold' : ''}`}>{activeBatch.name}</button></>
              )}
              {activeSubject && viewLevel === 'contents' && (
                  <><ChevronRight size={16} className="text-slate-600"/> <span className="text-blue-400 font-bold px-3 py-1 bg-blue-500/10 rounded-lg truncate max-w-[150px] sm:max-w-none">{activeSubject.name}</span></>
              )}
          </div>

          <div className="flex flex-wrap justify-between items-center gap-6">
              <h2 className="text-3xl font-bold text-white flex items-center gap-4 tracking-tight truncate flex-1">
                  {viewLevel === 'businesses' && <><Building2 className="text-blue-500 shrink-0" size={32}/> Manage Businesses</>}
                  {viewLevel === 'batches' && <><Layers className="text-blue-500 shrink-0" size={32}/> <span className="truncate" title={activeBusiness?.name}>{activeBusiness?.name} - Batches</span></>}
                  {viewLevel === 'batch_details' && <><FolderOpen className="text-blue-500 shrink-0" size={32}/> <span className="truncate" title={activeBatch?.name}>{activeBatch?.name}</span></>}
                  {viewLevel === 'contents' && <><MonitorPlay className="text-green-500 shrink-0" size={32}/> <span className="truncate" title={activeSubject?.name}>{activeSubject?.name}</span></>}
              </h2>
              <div className="flex flex-wrap gap-4 shrink-0">
                  
                  {/* 🔥 POSTS BUTTONS 🔥 */}
                  {canManageContent && (
                      <>
                          <button onClick={() => { fetchPosts(); setShowManagePostsModal(true); }} className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl font-semibold text-base flex items-center gap-2 transition-colors border border-white/10">
                              <MessageSquare size={20}/> Manage Posts
                          </button>
                          <button onClick={openPostModal} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-2xl font-semibold text-base flex items-center gap-2 transition-colors shadow-lg shadow-purple-500/20">
                              <Send size={20}/> Create Post
                          </button>
                      </>
                  )}

                  {viewLevel === 'businesses' && canManageBusiness && (
                      <button onClick={() => { setEditMode(false); setSelectedLogoName(""); setShowBusinessModal(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-semibold text-base flex items-center gap-2 transition-colors shadow-lg"><Plus size={20}/> New Business</button>
                  )}
                  {viewLevel === 'batches' && canManageBatches && (
                      <button onClick={() => { setEditMode(false); setSelectedLogoName(""); setShowBatchModal(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-semibold text-base flex items-center gap-2 transition-colors shadow-lg"><Plus size={20}/> New Batch</button>
                  )}
                  {viewLevel === 'batch_details' && canManageGroupsAndSubjects && (
                      <>
                          <button onClick={openInstallmentModal} className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-2xl font-semibold text-base flex items-center gap-2 transition-colors shadow-lg shadow-orange-500/20"><CreditCard size={20}/> Setup Installments</button>
                          {batchTab === 'groups' && <button onClick={() => { setEditMode(false); setShowGroupModal(true); setDiscountRules([{courseCount:'',pricePerCourse:''}]); }} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-semibold text-base flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"><Plus size={20}/> New Group</button>}
                          {batchTab === 'subjects' && <button onClick={() => { setEditMode(false); setShowCourseModal(true); setSelectedGroupPrices({}); }} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-semibold text-base flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"><Plus size={20}/> New Subject</button>}
                      </>
                  )}
                  {viewLevel === 'contents' && canManageContent && (
                      <>
                          <button onClick={() => { setShowLessonGroupModal(true); setEditMode(false); }} className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl font-semibold text-base flex items-center gap-2 transition-colors border border-white/10"><FolderPlus size={20}/> Add Folder</button>
                          <button onClick={() => { 
                              setShowContentModal(true); setContentType(''); setPrefilledFolder(''); setEditMode(false); 
                              setSelectedBatchesForContent([activeBatch.id]); // Default current batch
                          }} className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-2xl font-semibold text-base flex items-center gap-2 transition-colors shadow-lg shadow-green-500/20"><Plus size={20}/> Add Content</button>
                      </>
                  )}
              </div>
          </div>
      </div>

      {/* --- CONTENT LIST --- */}
      <div className="w-full space-y-6 relative">
          {viewLevel === 'businesses' && isSystemAdmin && (
              businesses.length === 0 ? <p className="text-center text-slate-400 py-16 bg-slate-800/30 rounded-3xl border border-white/10 backdrop-blur-xl text-lg">No businesses created yet.</p> : 
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {businesses.map((biz) => (
                    <div key={biz.id} className="group bg-slate-800/40 hover:bg-slate-800/60 border border-white/10 p-6 rounded-3xl flex flex-col gap-6 transition-all backdrop-blur-xl shadow-lg">
                        <div className="flex items-center gap-5">
                            <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center p-2 border border-white/5 group-hover:bg-white/20 transition-colors shrink-0">
                                <img src={getImageUrl(biz.logo)} onError={(e) => { e.target.src = '/logo.png'; }} alt="Logo" className="max-w-full max-h-full object-contain" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <h3 className="text-2xl font-bold text-white mb-1 truncate" title={biz.name}>{biz.name}</h3>
                                <span className="text-xs font-bold bg-blue-500/20 text-blue-300 px-3 py-1 rounded-lg border border-blue-500/30">{biz.category}</span>
                            </div>
                        </div>
                        
                        <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-slate-400">Head Manager:</span> <span className="text-white font-semibold truncate pl-2">{getManagerName(biz.head_manager_id)}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Asst Manager:</span> <span className="text-white font-semibold truncate pl-2">{getManagerName(biz.ass_manager_id)}</span></div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-auto">
                            <button onClick={() => { setEditData(biz); setShowAssignModal(true); }} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-colors border border-white/5" title="Assign Managers"><UserPlus size={16}/></button>
                            <button onClick={() => { setEditData(biz); setEditMode(true); setSelectedLogoName(""); setShowBusinessModal(true); }} className="text-blue-400 bg-white/5 hover:bg-blue-500 hover:text-white p-3 rounded-xl transition-colors" title="Edit Business"><Edit3 size={20}/></button>
                            <button onClick={() => toggleBusinessStatus(biz)} className={`p-3 rounded-xl border transition-colors ${biz.status === 1 ? 'text-green-400 bg-green-500/10 border-green-500/20 hover:bg-green-500 hover:text-white' : 'text-red-400 bg-red-500/10 border-red-500/20 hover:bg-red-500 hover:text-white'}`} title="Toggle Status"><Power size={20}/></button>
                            <button onClick={() => deleteItem('/admin/business/delete', { business_id: biz.id }, "Business Deleted")} className="text-red-400 bg-white/5 hover:bg-red-500 hover:text-white p-3 rounded-xl transition-colors" title="Delete Business"><Trash2 size={20}/></button>
                        </div>
                        <button onClick={() => openBusinessDetails(biz)} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-base font-bold flex justify-center items-center gap-2 transition-colors shadow-lg shadow-blue-500/20 mt-1">Manage Batches <ChevronRight size={18}/></button>
                    </div>
                ))}
              </div>
          )}

          {viewLevel === 'batches' && (
              batches.length === 0 ? <p className="text-center text-slate-400 py-16 bg-slate-800/30 rounded-3xl border border-white/10 backdrop-blur-xl text-lg">No batches available yet.</p> : 
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {batches.map((batch) => (
                    <div key={batch.id} className="group bg-slate-800/40 hover:bg-slate-800/60 border border-white/10 p-6 md:p-8 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 transition-all backdrop-blur-xl shadow-lg">
                        <div className="flex items-center gap-6 overflow-hidden w-full sm:w-auto">
                            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center p-3 border border-white/5 group-hover:bg-white/20 transition-colors shrink-0">
                                <img src={getImageUrl(batch.logo || activeBusiness?.logo)} onError={(e) => { e.target.src = '/logo.png'; }} alt="Logo" className="max-w-full max-h-full object-contain" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <h3 className="text-xl font-bold text-white mb-1 truncate" title={batch.name}>{batch.name}</h3>
                                <p className="text-base text-blue-400 font-medium">{batch.groups?.length || 0} Groups Assigned</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0 shrink-0">
                            {canManageBatches && (
                                <>
                                    <button onClick={() => toggleBatchStatus(batch)} className={`p-3 rounded-xl border transition-colors ${batch.status === 1 ? 'text-green-400 bg-green-500/10 border-green-500/20 hover:bg-green-500 hover:text-white' : 'text-red-400 bg-red-500/10 border-red-500/20 hover:bg-red-500 hover:text-white'}`}><Power size={20}/></button>
                                    <button onClick={() => { setEditData(batch); setEditMode(true); setSelectedLogoName(""); setShowBatchModal(true); }} className="text-blue-400 bg-white/5 hover:bg-blue-500 hover:text-white p-3 rounded-xl transition-colors"><Edit3 size={20}/></button>
                                    <button onClick={() => deleteItem('/admin/batch/delete', { batch_id: batch.id }, "Batch Deleted")} className="text-red-400 bg-white/5 hover:bg-red-500 hover:text-white p-3 rounded-xl transition-colors"><Trash2 size={20}/></button>
                                </>
                            )}
                            <button onClick={() => openBatchDetails(batch)} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl text-base font-bold flex justify-center items-center gap-2 transition-colors ml-2 shadow-lg shadow-blue-500/20">Manage <ChevronRight size={18}/></button>
                        </div>
                    </div>
                ))}
              </div>
          )}

          {viewLevel === 'batch_details' && (
              <div className="flex flex-col h-full animate-in fade-in duration-300">
                  <div className="flex flex-wrap gap-3 mb-6 bg-slate-800/60 p-2.5 rounded-2xl w-max border border-white/10 shadow-lg">
                      <button onClick={() => setBatchTab('groups')} className={`px-6 py-3 rounded-xl font-bold text-base flex items-center gap-2 transition-all whitespace-nowrap ${batchTab === 'groups' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><Layers size={20}/> Payment Groups</button>
                      <button onClick={() => setBatchTab('subjects')} className={`px-6 py-3 rounded-xl font-bold text-base flex items-center gap-2 transition-all whitespace-nowrap ${batchTab === 'subjects' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><BookOpen size={20}/> Subjects List</button>
                  </div>

                  <div className="space-y-6">
                      {batchTab === 'groups' && (
                          activeBatch?.groups?.length === 0 ? <p className="text-center text-slate-400 py-16 bg-slate-800/30 rounded-3xl border border-white/10 backdrop-blur-xl text-lg">No payment groups created yet.</p> :
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {activeBatch?.groups?.map((group) => (
                                <div key={group.id} className="bg-slate-800/40 border border-white/10 p-6 md:p-8 rounded-3xl flex flex-col justify-between gap-5 transition-all backdrop-blur-xl hover:bg-slate-800/60 shadow-lg relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                                    <div className="flex justify-between items-start">
                                        <div className="pl-4 overflow-hidden pr-4">
                                            <h3 className="text-xl font-bold text-white mb-2 truncate" title={group.name}>{group.name}</h3>
                                            <span className="text-sm font-semibold bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-lg border border-blue-500/30">{group.type === 1 ? 'Monthly Payment' : 'Full Payment'}</span>
                                        </div>
                                        {canManageGroupsAndSubjects && (
                                            <div className="flex gap-2 shrink-0">
                                                <button onClick={() => { setEditData(group); setEditMode(true); setDiscountRules(group.discount_rules ? JSON.parse(group.discount_rules) : []); setShowGroupModal(true); }} className="text-blue-400 bg-blue-500/10 hover:bg-blue-500 hover:text-white p-3 rounded-xl transition-colors"><Edit3 size={20}/></button>
                                                <button onClick={() => deleteItem('/course-setup/group', { group_id: group.id }, "Group Deleted")} className="text-red-400 bg-red-500/10 hover:bg-red-500 hover:text-white p-3 rounded-xl transition-colors"><Trash2 size={20}/></button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {group.type !== 1 && group.discount_rules && JSON.parse(group.discount_rules).length > 0 && (
                                        <div className="flex flex-wrap gap-3 pt-4 pl-4 border-t border-white/10">
                                            {JSON.parse(group.discount_rules).map((rule, ridx) => (
                                                <span key={ridx} className="text-sm font-medium bg-white/5 text-slate-300 px-4 py-2 rounded-xl border border-white/10">Buy {rule.courseCount} @ Rs {rule.pricePerCourse}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                          </div>
                      )}

                      {batchTab === 'subjects' && (
                          Object.keys(groupedSubjects).length === 0 ? <p className="text-center text-slate-400 py-16 bg-slate-800/30 rounded-3xl border border-white/10 backdrop-blur-xl text-lg">No subjects created yet.</p> : 
                          <div className="space-y-8">
                              {Object.keys(groupedSubjects).map((streamName, idx) => (
                                  <div key={idx} className="bg-slate-800/30 p-6 md:p-8 rounded-3xl border border-white/10 backdrop-blur-xl shadow-lg">
                                      {(activeBusiness?.category === 'Advance Level' || activeBusiness?.category === 'AL') && (
                                          <h3 className="text-xl font-bold text-blue-400 mb-6 flex items-center gap-3 uppercase tracking-wide"><Layers size={24}/> {streamName} Stream</h3>
                                      )}
                                      <div className="grid grid-cols-1 gap-4">
                                          {groupedSubjects[streamName].map((sub) => (
                                              <div key={sub.id} className="bg-white/5 hover:bg-white/10 border border-white/10 p-5 rounded-2xl flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5 transition-colors overflow-hidden">
                                                  <div className="flex items-center gap-4 w-full xl:w-auto overflow-hidden">
                                                      {canManageGroupsAndSubjects && <div className="cursor-move text-slate-500 hover:text-white shrink-0"><GripVertical size={24}/></div>}
                                                      <div className="overflow-hidden">
                                                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                                                              <h3 className="text-lg font-bold text-white truncate max-w-[200px] md:max-w-[400px]" title={sub.name}>{sub.name}</h3>
                                                              {sub.code && <span className="text-sm font-bold text-slate-300 bg-white/10 px-3 py-1 rounded-lg border border-white/10 shrink-0 w-max">{sub.code}</span>}
                                                          </div>
                                                          <div className="flex flex-wrap gap-2">
                                                              {sub.groupPrices.map((gp, i) => (
                                                                  <span key={i} className="text-sm font-medium text-blue-300 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20 flex items-center gap-2 whitespace-nowrap">
                                                                      {gp.groupName}: <span className="text-white font-bold">Rs {gp.price}</span>
                                                                  </span>
                                                              ))}
                                                          </div>
                                                      </div>
                                                  </div>
                                                  <div className="flex gap-3 items-center w-full xl:w-auto justify-end mt-2 xl:mt-0 shrink-0">
                                                      <button onClick={() => openContentsView(sub)} className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl text-base font-bold flex items-center gap-2 transition-colors shadow-lg shadow-green-500/20"><MonitorPlay size={18}/> Manage Content</button>
                                                      {canManageGroupsAndSubjects && (
                                                          <>
                                                              <button onClick={() => { 
                                                                  setEditData(sub); setEditMode(true); 
                                                                  const gPrices = {}; sub.groupPrices.forEach(p => gPrices[p.groupId] = { price: p.price, deliverTute: p.deliverTute || false, tuteName: p.tuteName || '', tuteFile: null }); 
                                                                  setSelectedGroupPrices(gPrices); setShowCourseModal(true); 
                                                              }} className="text-blue-400 bg-white/5 hover:bg-blue-600 hover:text-white border border-white/5 p-3 rounded-xl transition-colors"><Edit3 size={20}/></button>
                                                              <button onClick={() => deleteItem('/admin/course/delete', { course_id: sub.id }, "Subject Deleted")} className="text-red-400 bg-white/5 hover:bg-red-600 hover:text-white border border-white/5 p-3 rounded-xl transition-colors"><Trash2 size={20}/></button>
                                                          </>
                                                      )}
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          )}

          {viewLevel === 'contents' && (
              <div className="bg-slate-800/40 border border-white/10 rounded-3xl flex flex-col min-h-[600px] overflow-hidden backdrop-blur-xl shadow-2xl">
                  <div className="flex overflow-x-auto custom-scrollbar border-b border-white/10 bg-slate-900/50 p-4 gap-3">
                      {[ { id: 'live', label: 'Live Classes', icon: Video }, { id: 'recording', label: 'Recordings', icon: MonitorPlay },
                         { id: 'document', label: 'Documents', icon: FileText }, { id: 'sPaper', label: 'Structured', icon: FileSignature }, { id: 'paper', label: 'MCQs', icon: CheckCircle }
                      ].map(tab => (
                          <button key={tab.id} onClick={() => setContentTab(tab.id)} className={`flex items-center gap-3 px-6 py-3.5 rounded-xl text-base font-bold transition-all whitespace-nowrap ${contentTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'}`}>
                              <tab.icon size={20}/> {tab.label}
                          </button>
                      ))}
                  </div>
                  
                  <div className="p-6 md:p-8 space-y-10 overflow-y-auto">
                      {lessonGroups.filter(isMatchedType).length > 0 && (
                          <div className="space-y-6">
                              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-2">Organized Folders</h4>
                              
                              {lessonGroups.filter(isMatchedType).map((folder) => (
                                  <div key={folder.id} className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden transition-all">
                                      <div className="flex flex-wrap justify-between items-center cursor-pointer p-6 hover:bg-white/5 transition-colors gap-4" onClick={() => toggleFolder(folder.id)}>
                                          <div className="flex items-center gap-4">
                                              <div className={`p-2 rounded-xl transition-colors ${openFolders[folder.id] ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-slate-400'}`}>
                                                <FolderOpen size={24}/>
                                              </div>
                                              <h4 className={`text-lg font-bold transition-colors truncate max-w-[150px] md:max-w-[300px] ${openFolders[folder.id] ? 'text-white' : 'text-slate-300'}`} title={folder.title || folder.name}>{folder.title || folder.name}</h4>
                                              <ChevronDown size={20} className={`text-slate-500 transition-transform ${openFolders[folder.id] ? 'rotate-180 text-blue-400' : ''}`}/>
                                          </div>
                                          <div className="flex gap-2 items-center">
                                              {canManageContent && (
                                                  <>
                                                      <button onClick={(e) => { e.stopPropagation(); setContentType(contentTab); setPrefilledFolder(folder.id); setSelectedBatchesForContent([activeBatch.id]); setShowContentModal(true); setEditMode(false); }} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-md mr-2"><Plus size={16}/> Add Content</button>
                                                      <button onClick={(e) => { e.stopPropagation(); setEditData(folder); setEditMode(true); setShowLessonGroupModal(true); }} className="text-blue-400 hover:bg-blue-500 hover:text-white bg-blue-500/10 p-2.5 rounded-xl transition-colors"><Edit3 size={18}/></button>
                                                      <button onClick={(e) => { e.stopPropagation(); deleteItem('/admin/content-group/delete', { contentGroupId: folder.id }, "Folder Deleted"); }} className="text-red-400 hover:bg-red-500 hover:text-white bg-red-500/10 p-2.5 rounded-xl transition-colors"><Trash2 size={18}/></button>
                                                  </>
                                              )}
                                          </div>
                                      </div>
                                      
                                      {openFolders[folder.id] && (
                                        <div className="border-t border-white/5 bg-black/20 p-4">
                                            {subjectContents.filter(c => isMatchedType(c) && getFolderId(c) === String(folder.id)).map((content) => (
                                                <div key={content.id} className="group flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b border-white/5 last:border-0 hover:bg-white/5 rounded-2xl transition-colors gap-4">
                                                    <div className="flex items-center gap-4 w-full sm:w-auto overflow-hidden">
                                                        {canManageContent && <GripVertical size={20} className="text-slate-600 cursor-grab hover:text-white shrink-0"/>}
                                                        <div className="flex flex-col overflow-hidden">
                                                            <span className="text-base font-bold text-slate-200 group-hover:text-white transition-colors truncate" title={content.title}>{content.title}</span>
                                                            <span className="text-sm font-medium text-blue-400 mt-1">{content.date ? content.date.split('T')[0] : 'No Date'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 mt-2 sm:mt-0">
                                                        <button onClick={() => setPreviewData(content)} className="bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors">PREVIEW</button>
                                                        {canManageContent && (
                                                            <>
                                                                <button onClick={() => { setEditData(content); setEditMode(true); setShowContentModal(true); setContentType(contentTab); }} className="bg-white/5 text-blue-400 hover:bg-blue-500 hover:text-white p-2.5 rounded-xl transition-colors"><Edit3 size={18}/></button>
                                                                <button onClick={() => deleteItem('/admin/content/delete', { content_id: content.id }, "Content Deleted")} className="bg-white/5 text-red-400 hover:bg-red-500 hover:text-white p-2.5 rounded-xl transition-colors"><Trash2 size={18}/></button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {subjectContents.filter(c => isMatchedType(c) && getFolderId(c) === String(folder.id)).length === 0 && <p className="text-base text-slate-500 py-6 text-center font-medium">This folder is empty.</p>}
                                        </div>
                                      )}
                                  </div>
                              ))}
                          </div>
                      )}

                      <div className="mt-10">
                          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 pl-2">Uncategorized Items</h4>
                          <div className="bg-white/5 border border-white/10 rounded-3xl p-4">
                              {subjectContents.filter(c => isMatchedType(c) && !getFolderId(c)).map((content) => (
                                  <div key={content.id} className="group flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b border-white/5 last:border-0 hover:bg-white/5 rounded-2xl transition-colors gap-4">
                                      <div className="flex items-center gap-4 w-full sm:w-auto overflow-hidden">
                                          {canManageContent && <GripVertical size={20} className="text-slate-600 cursor-grab hover:text-white shrink-0"/>}
                                          <div className="flex flex-col overflow-hidden">
                                              <span className="text-base font-bold text-slate-200 group-hover:text-white transition-colors truncate" title={content.title}>{content.title}</span>
                                              <span className="text-sm font-medium text-blue-400 mt-1">{content.date ? content.date.split('T')[0] : 'No Date'}</span>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 mt-2 sm:mt-0">
                                          <button onClick={() => setPreviewData(content)} className="bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors">PREVIEW</button>
                                          {canManageContent && (
                                              <>
                                                  <button onClick={() => { setEditData(content); setEditMode(true); setShowContentModal(true); setContentType(contentTab); }} className="bg-white/5 text-blue-400 hover:bg-blue-500 hover:text-white p-2.5 rounded-xl transition-colors"><Edit3 size={18}/></button>
                                                  <button onClick={() => deleteItem('/admin/content/delete', { content_id: content.id }, "Content Deleted")} className="bg-white/5 text-red-400 hover:bg-red-500 hover:text-white p-2.5 rounded-xl transition-colors"><Trash2 size={18}/></button>
                                              </>
                                          )}
                                      </div>
                                  </div>
                              ))}
                              {subjectContents.filter(c => isMatchedType(c) && !getFolderId(c)).length === 0 && <p className="text-base text-slate-500 py-6 text-center font-medium">No uncategorized items.</p>}
                          </div>
                      </div>
                  </div>
              </div>
          )}
      </div>

      {/* --- MODALS --- */}
      
      {/* 🔥 VIEW & MANAGE POSTS MODAL 🔥 */}
      {showManagePostsModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in fade-in duration-200">
            <div className="bg-slate-800/90 border border-white/10 rounded-[2rem] w-full max-w-5xl shadow-2xl backdrop-blur-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 md:p-8 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3"><MessageSquare className="text-blue-400"/> Manage Announcements</h3>
                    <button onClick={() => setShowManagePostsModal(false)} className="text-slate-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/5 transition-all hover:bg-red-500"><X size={20}/></button>
                </div>
                <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                    {postsList.length === 0 ? <p className="text-slate-400 text-center py-10">No announcements found.</p> : 
                    postsList.map(post => (
                        <div key={post.id} className="bg-black/20 border border-white/5 p-6 rounded-2xl flex flex-col md:flex-row gap-6 items-start">
                            {post.image && post.image !== 'default.png' && (
                                <img src={getPostImageUrl(post.image)} alt="Post" className="w-full md:w-48 h-32 object-cover rounded-xl border border-white/10" />
                            )}
                            <div className="flex-1">
                                <h4 className="text-xl font-bold text-white mb-2">{post.title}</h4>
                                <p className="text-slate-400 text-sm whitespace-pre-wrap">{post.caption}</p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <span className="text-xs font-semibold bg-white/5 text-slate-300 px-3 py-1 rounded-lg">{new Date(post.created_at).toLocaleDateString()}</span>
                                    {post.business_id && <span className="text-xs font-semibold bg-purple-500/20 text-purple-300 px-3 py-1 rounded-lg">Targeted</span>}
                                </div>
                            </div>
                            <button onClick={async () => {
                                if(window.confirm("Delete this post?")) {
                                    try { await api.delete('/admin/manager/post/delete', { data: { post_id: post.id } }); fetchPosts(); toast.success("Deleted!"); } 
                                    catch(e) { toast.error("Failed to delete"); }
                                }
                            }} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white p-3 rounded-xl transition-colors"><Trash2 size={20}/></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* 🔥 NEW POST MODAL 🔥 */}
      {showPostModal && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in fade-in duration-200">
            <div className="bg-slate-800/90 border border-white/10 rounded-[2rem] p-8 w-full max-w-4xl shadow-2xl backdrop-blur-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4 shrink-0">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3"><Send className="text-purple-400"/> Create Announcement</h3>
                    <button onClick={() => setShowPostModal(false)} className="text-slate-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/5 transition-all hover:bg-red-500"><X size={20}/></button>
                </div>
                <form onSubmit={handlePostSubmit} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row gap-6 h-full">
                        <div className="flex-1 space-y-6">
                            <div>
                                <label className="text-sm font-semibold text-slate-300 mb-2 block">Post Title *</label>
                                <input type="text" name="title" required className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-purple-500 transition-colors" />
                            </div>
                            <div className="flex-1">
                                <label className="text-sm font-semibold text-slate-300 mb-2 block">Description *</label>
                                <textarea name="description" required rows="6" className="w-full h-full bg-black/20 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-purple-500 transition-colors resize-none"></textarea>
                            </div>
                        </div>
                        <div className="w-full md:w-80 flex flex-col gap-6 shrink-0">
                            <div>
                                <label className="text-sm font-semibold text-slate-300 mb-2 block">Attach Image (Optional)</label>
                                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-white/20 rounded-xl bg-black/20 cursor-pointer hover:bg-white/5 transition-colors hover:border-purple-500/50">
                                    <UploadCloud size={28} className="text-slate-400 mb-2"/>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Click to Upload</span>
                                    <input type="file" name="image" accept="image/*" className="hidden" />
                                </label>
                            </div>
                            <div className="bg-purple-500/10 p-5 rounded-2xl border border-purple-500/20 space-y-4">
                                <h4 className="text-sm font-bold text-purple-300 uppercase tracking-widest flex items-center gap-2 mb-2"><Users size={16}/> Target Audience</h4>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Select Business</label>
                                    <select name="businessId" value={postBizId} onChange={(e) => setPostBizId(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-purple-500">
                                        {isSystemAdmin ? (
                                            <>
                                                <option value="all">All Businesses (Global)</option>
                                                {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                            </>
                                        ) : (
                                            <option value={activeBusiness?.id}>{activeBusiness?.name}</option>
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Select Batch</label>
                                    <select name="batchId" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-purple-500">
                                        <option value="all">All Batches</option>
                                        {postBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-white/10 shrink-0">
                        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold py-4 text-base rounded-2xl shadow-lg flex justify-center items-center gap-2 transition-transform hover:scale-[1.01] disabled:opacity-70 disabled:scale-100">
                            {loading ? <Loader2 className="animate-spin" size={20}/> : <><Send size={18}/> Publish Post & Send Push Notification</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* 🔥 ADD/EDIT CONTENT MODAL (WITH MULTI-BATCH ASSIGNMENT) 🔥 */}
      {showContentModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/90 backdrop-blur-xl p-4 animate-in fade-in duration-200">
              <div className="bg-slate-800/90 border border-white/10 rounded-3xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden backdrop-blur-2xl">
                  <div className="p-6 md:p-8 border-b border-white/10 flex justify-between items-center bg-white/5">
                      <h3 className="text-2xl font-bold text-white flex items-center gap-3"><Plus className="text-green-400" size={28}/> {editMode ? 'Edit Content' : 'Add Content (Multi-Batch)'}</h3>
                      <button onClick={() => { setShowContentModal(false); setContentType(''); setPrefilledFolder(''); setMassAssignSubjects([]); setSelectedBatchesForContent([]); }} className="text-slate-400 hover:text-white bg-white/5 border border-white/5 p-2.5 rounded-xl transition-colors"><X size={20}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                      <form onSubmit={handleMassAssignSubmit} className="space-y-8 max-w-5xl mx-auto">
                          
                          <div className="flex flex-col md:flex-row gap-6">
                              <div className="flex-1">
                                  <label className="text-sm font-semibold text-slate-300 mb-2 block uppercase tracking-wider">Content Type *</label>
                                  <select value={contentType} onChange={e => setContentType(e.target.value)} disabled={editMode} className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-green-500 disabled:opacity-50">
                                      <option value="" disabled className="bg-slate-800">Select Type</option>
                                      <option value="live" className="bg-slate-800">Live Class</option><option value="recording" className="bg-slate-800">Recording</option>
                                      <option value="document" className="bg-slate-800">Document / PDF</option><option value="sPaper" className="bg-slate-800">Structured Paper</option><option value="paper" className="bg-slate-800">MCQ Paper</option>
                                  </select>
                              </div>
                              
                              {contentType && (
                                  <div className="flex-1 animate-in fade-in duration-300">
                                      <label className="text-sm font-semibold text-slate-300 mb-2 block uppercase tracking-wider">Target Folder (Current Batch Only)</label>
                                      <select name="contentGroupId" defaultValue={editMode ? (editData?.content_group_id || "") : prefilledFolder} className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-green-500">
                                          <option value="" className="bg-slate-800">No Folder (Uncategorized)</option>
                                          {lessonGroups.filter(g => parseInt(g.type) === getTypeInt(contentType)).map(folder => (
                                              <option key={folder.id} value={folder.id} className="bg-slate-800">{folder.title || folder.name}</option>
                                          ))}
                                      </select>
                                  </div>
                              )}
                          </div>

                          {contentType && (
                              <>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 p-6 md:p-8 rounded-3xl border border-white/10">
                                      <div className="md:col-span-2">
                                          <label className="text-sm font-semibold text-slate-300 mb-2 block">Title *</label>
                                          <input type="text" name="title" defaultValue={editData?.title} required className="w-full bg-black/20 border border-white/10 focus:border-green-500 rounded-xl p-4 text-white outline-none" />
                                      </div>
                                      
                                      {(contentType === 'live' || contentType === 'recording') && (
                                          <div className="md:col-span-2">
                                              <label className="text-sm font-semibold text-slate-300 mb-2 block">URL Link *</label>
                                              <input type="url" name="link" defaultValue={editData?.link} required className="w-full bg-black/20 border border-white/10 focus:border-green-500 rounded-xl p-4 text-white outline-none" />
                                          </div>
                                      )}

                                      {contentType === 'recording' && (
                                          <div>
                                              <label className="text-sm font-semibold text-slate-300 mb-2 block">Meeting ID</label>
                                              <input type="text" name="zoomMeetingId" defaultValue={editData?.meetingId} className="w-full bg-black/20 border border-white/10 focus:border-green-500 rounded-xl p-4 text-white outline-none" />
                                          </div>
                                      )}

                                      {(contentType === 'document' || contentType === 'sPaper' || contentType === 'paper') && (
                                          <div className="md:col-span-2">
                                              <label className="text-sm font-semibold text-slate-300 mb-2 block">File Upload {editMode && <span className="text-green-400 font-normal ml-2">(Leave empty to keep existing)</span>}</label>
                                              <input type="file" name="file" required={!editMode} className="w-full bg-black/20 border border-white/10 rounded-xl p-2.5 text-slate-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:bg-white/10 file:text-white" />
                                          </div>
                                      )}

                                      <div>
                                          <label className="text-sm font-semibold text-slate-300 mb-2 block">Date</label>
                                          <input type={(contentType==='document'||contentType==='sPaper'||contentType==='paper') ? "month":"date"} name="date" defaultValue={editData?.date ? editData.date.split('T')[0] : ''} required className="w-full bg-black/20 border border-white/10 focus:border-green-500 rounded-xl p-4 text-white outline-none" />
                                      </div>

                                      {contentType === 'live' && (
                                          <>
                                              <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Start Time</label><input type="time" name="startTime" defaultValue={editData?.startTime} className="w-full bg-black/20 border border-white/10 focus:border-green-500 rounded-xl p-4 text-white outline-none" /></div>
                                              <div><label className="text-sm font-semibold text-slate-300 mb-2 block">End Time</label><input type="time" name="endTime" defaultValue={editData?.endTime} className="w-full bg-black/20 border border-white/10 focus:border-green-500 rounded-xl p-4 text-white outline-none" /></div>
                                          </>
                                      )}

                                      {contentType === 'paper' && (
                                          <>
                                              <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Time (Min) *</label><input type="number" name="paperTime" defaultValue={editData?.paperTime} required className="w-full bg-black/20 border border-white/10 focus:border-green-500 rounded-xl p-4 text-white outline-none" /></div>
                                              <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Questions *</label><input type="number" name="questionCount" defaultValue={editData?.questionCount} required className="w-full bg-black/20 border border-white/10 focus:border-green-500 rounded-xl p-4 text-white outline-none" /></div>
                                          </>
                                      )}
                                      
                                      <div className="md:col-span-2 mt-4">
                                          <label className="flex items-center gap-4 cursor-pointer w-max group bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                              <div className="relative flex items-center justify-center">
                                                  <input type="checkbox" name="isFree" value="1" defaultChecked={editData?.isFree} className="peer w-6 h-6 appearance-none bg-black/40 border-2 border-slate-600 rounded-lg checked:bg-green-500 checked:border-green-500" />
                                                  <CheckCircle size={16} className="text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none"/>
                                              </div>
                                              <span className="text-base font-bold text-slate-200 group-hover:text-white">Mark as Free Content (Open for all)</span>
                                          </label>
                                      </div>
                                  </div>

                                  {/* 🔥 MULTI BATCH MERGE OPTION UI 🔥 */}
                                  {!editMode && (
                                      <div className="pt-6">
                                          <div className="flex justify-between items-end mb-6">
                                              <h4 className="text-lg font-bold text-white flex items-center gap-3"><BookOpen size={24} className="text-blue-500"/> Assign to Subjects</h4>
                                          </div>

                                          <div className="bg-black/30 p-6 rounded-2xl mb-6 border border-white/10">
                                              <label className="text-sm font-semibold text-slate-300 mb-3 block">Share with multiple Batches (Merge Content):</label>
                                              <div className="flex flex-wrap gap-4">
                                                  {batches.map(b => (
                                                      <label key={`b-sel-${b.id}`} className={`flex items-center gap-3 px-4 py-2 rounded-xl cursor-pointer transition-colors border ${selectedBatchesForContent.includes(b.id) ? 'bg-blue-500/20 border-blue-500/50 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}>
                                                          <input type="checkbox" className="hidden" 
                                                                 checked={selectedBatchesForContent.includes(b.id)} 
                                                                 onChange={(e) => {
                                                                     if(e.target.checked) setSelectedBatchesForContent([...selectedBatchesForContent, b.id]);
                                                                     else setSelectedBatchesForContent(selectedBatchesForContent.filter(id => id !== b.id));
                                                                 }} 
                                                          />
                                                          <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center ${selectedBatchesForContent.includes(b.id) ? 'bg-blue-500 border-blue-500' : 'border-slate-500'}`}>
                                                              {selectedBatchesForContent.includes(b.id) && <CheckCircle size={12} className="text-white"/>}
                                                          </div>
                                                          <span className="font-bold text-sm">{b.name}</span>
                                                      </label>
                                                  ))}
                                              </div>
                                          </div>

                                          <div className="bg-white/5 rounded-3xl p-6 md:p-8 border border-white/10 space-y-8">
                                              {batches.filter(b => selectedBatchesForContent.includes(b.id)).map(selectedBatch => (
                                                  <div key={`batch-group-${selectedBatch.id}`} className="mb-6">
                                                      <h4 className="text-xl font-bold text-blue-400 mb-4 border-b border-white/10 pb-2">{selectedBatch.name}</h4>
                                                      
                                                      {selectedBatch.groups?.length === 0 && <p className="text-sm text-slate-500">No groups in this batch.</p>}

                                                      {selectedBatch.groups?.map((group, gIdx) => (
                                                          <div key={`g-assign-${gIdx}`} className="mb-6 ml-4">
                                                              <h5 className="text-base font-bold text-slate-200 mb-4">{group.name} <span className="text-xs font-medium text-slate-400 bg-white/5 px-3 py-1 rounded-lg ml-2 border border-white/5">{group.type === 1 ? 'Monthly' : 'Full'}</span></h5>
                                                              
                                                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                                                  {group.courses?.map((course, cIdx) => (
                                                                      <label key={`c-assign-${cIdx}`} className={`flex items-center gap-4 cursor-pointer p-4 rounded-2xl border transition-colors group ${massAssignSubjects.includes(course.id) ? 'bg-blue-600/20 border-blue-500/50' : 'bg-black/20 border-white/10 hover:border-white/20'}`}>
                                                                          <div className="relative flex items-center justify-center shrink-0">
                                                                              <input type="checkbox" checked={massAssignSubjects.includes(course.id)} onChange={() => toggleMassAssignSubject(course.id)} className="peer w-6 h-6 appearance-none bg-black/40 border-2 border-slate-600 rounded-lg checked:bg-blue-500 checked:border-blue-500" />
                                                                              <CheckCircle size={16} className="text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none"/>
                                                                          </div>
                                                                          <span className={`text-base font-bold truncate ${massAssignSubjects.includes(course.id) ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{course.name}</span>
                                                                      </label>
                                                                  ))}
                                                                  {group.courses?.length === 0 && <p className="text-xs text-slate-500">No subjects in this group.</p>}
                                                              </div>
                                                          </div>
                                                      ))}
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  )}

                                  <div className="pt-6 pb-4">
                                      <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-green-500/20 mt-4">
                                          {editMode ? 'Update Content' : 'Publish Content'}
                                      </button>
                                  </div>
                              </>
                          )}
                      </form>
                  </div>
              </div>
          </div>
      )}

      {/* ... (Other modals like Business, Batch, Group, Installment, Course, Preview stay same as they are perfectly working) ... */}

      {showBusinessModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in fade-in duration-200">
              <div className="bg-slate-800/90 border border-white/10 rounded-[2rem] p-8 w-full max-w-5xl shadow-2xl backdrop-blur-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4 shrink-0">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3"><Building2 className="text-blue-400"/> {editMode ? 'Edit Business Configuration' : 'Setup New Business'}</h3>
                    <button onClick={() => setShowBusinessModal(false)} className="text-slate-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/5 transition-all hover:bg-red-500"><X size={20}/></button>
                </div>
                
                <form onSubmit={handleBusinessSubmit} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                    <div className="flex flex-col lg:flex-row gap-8">
                        
                        {/* Left Column: Basic Info */}
                        <div className="flex-1 space-y-5">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2">Basic Information</h4>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="col-span-2">
                                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Business Name *</label>
                                    <input type="text" name="name" defaultValue={editData?.name} required className="w-full bg-black/20 border border-white/10 rounded-xl p-3.5 text-sm text-white outline-none focus:border-blue-500 transition-colors" placeholder="e.g. Science Academy" />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Category *</label>
                                    <select name="category" defaultValue={editData?.category || "Advance Level"} required onChange={(e) => { document.getElementById('streamsDiv').style.display = (e.target.value === 'Advance Level' || e.target.value === 'AL') ? 'block' : 'none'; }} className="w-full bg-black/20 border border-white/10 rounded-xl p-3.5 text-sm text-white outline-none focus:border-blue-500 cursor-pointer">
                                        <option value="Advance Level" className="bg-slate-800">Advance Level</option>
                                        <option value="Ordinary Level" className="bg-slate-800">Ordinary Level</option>
                                        <option value="Others" className="bg-slate-800">Others</option>
                                    </select>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Medium *</label>
                                    <select name="medium" defaultValue={editData?.isEnglish ? 'English' : 'Sinhala'} required className="w-full bg-black/20 border border-white/10 rounded-xl p-3.5 text-sm text-white outline-none focus:border-blue-500 cursor-pointer">
                                        <option value="Sinhala" className="bg-slate-800">Sinhala Medium</option>
                                        <option value="English" className="bg-slate-800">English Medium</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Description (Optional)</label>
                                <textarea name="description" defaultValue={editData?.description} rows="3" className="w-full bg-black/20 border border-white/10 rounded-xl p-3.5 text-sm text-white outline-none focus:border-blue-500 resize-none"></textarea>
                            </div>
                        </div>

                        {/* Right Column: Settings & Uploads */}
                        <div className="w-full lg:w-96 space-y-5 shrink-0">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2">Branding & Logic</h4>
                            <div>
                                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Business Logo *</label>
                                <label className="flex items-center justify-center h-20 border-2 border-dashed border-white/20 rounded-xl bg-black/20 cursor-pointer hover:bg-white/5 transition-colors hover:border-blue-500/50">
                                    <div className="flex items-center gap-3">
                                        <UploadCloud size={24} className="text-blue-400"/>
                                        <span className="text-xs text-slate-300 font-bold">{selectedLogoName || "Select Image File"}</span>
                                    </div>
                                    <input type="file" name="logo" required={!editMode} accept="image/*" className="hidden" onChange={(e) => setSelectedLogoName(e.target.files[0]?.name || "")} />
                                </label>
                            </div>

                            <div id="streamsDiv" style={{display: (editData?.category === 'Advance Level' || editData?.category === 'AL' || !editData) ? 'block' : 'none'}} className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
                                <label className="text-xs font-bold text-blue-300 mb-3 block uppercase tracking-wider">A/L Streams (Select all that apply)</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Art', 'Commerce', 'Tech', 'Bio', 'Maths'].map(s => (
                                        <label key={s} className="flex items-center gap-2 cursor-pointer text-white text-xs font-medium bg-black/30 px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                                            <input type="checkbox" name={`stream_${s}`} value={s} defaultChecked={editData?.streams?.includes(s)} className="w-3.5 h-3.5 accent-blue-500"/> {s}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="bg-orange-500/10 p-4 rounded-xl border border-orange-500/20">
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input type="checkbox" name="isDiscountEnabledForInstallments" value="1" defaultChecked={editData?.isDiscountEnabledForInstallments} className="w-5 h-5 accent-orange-500 mt-0.5 shrink-0"/>
                                    <div>
                                        <span className="text-sm font-bold text-white group-hover:text-orange-300 transition-colors">Allow Installment Discounts?</span>
                                        <p className="text-[10px] text-orange-200/60 mt-1 leading-tight">If ticked, students paying via installments will still receive the bundle discount.</p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/10 mt-6 shrink-0">
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 text-base rounded-2xl shadow-lg transition-transform hover:scale-[1.01] uppercase tracking-wide flex justify-center items-center gap-2">
                            {editMode ? 'Update Business Settings' : 'Initialize New Business'}
                        </button>
                    </div>
                </form>
              </div>
          </div>
      )}

      {showAssignModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in fade-in duration-200">
              <div className="bg-slate-800/90 border border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl backdrop-blur-2xl">
                <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-bold text-white">Assign Managers</h3><button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/5"><X size={20}/></button></div>
                <form onSubmit={handleAssignManagers} className="space-y-6">
                    <div>
                        <label className="text-sm font-semibold text-slate-300 mb-2 block">Head Manager</label>
                        <select name="head_manager" defaultValue={editData?.head_manager_id || ""} className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500">
                            <option value="" className="bg-slate-800">-- Select Manager --</option>
                            {managersList.filter(m => m.role === 'Manager' || m.role === 'MANAGER').map(m => <option key={m.id} value={m.id} className="bg-slate-800">{m.firstName} {m.lastName}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-300 mb-2 block">Assistant Manager</label>
                        <select name="ass_manager" defaultValue={editData?.ass_manager_id || ""} className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500">
                            <option value="" className="bg-slate-800">-- Select Asst. Manager --</option>
                            {managersList.filter(m => m.role === 'Ass Manager' || m.role === 'ASS_MANAGER').map(m => <option key={m.id} value={m.id} className="bg-slate-800">{m.firstName} {m.lastName}</option>)}
                        </select>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 text-lg rounded-2xl shadow-lg mt-4">Assign Staff</button>
                </form>
              </div>
          </div>
      )}

      {/* 🔥 EDIT BATCH MODAL 🔥 */}
      {showBatchModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in fade-in duration-200">
              <div className="bg-slate-800/90 border border-white/10 rounded-3xl p-8 w-full max-w-2xl shadow-2xl backdrop-blur-2xl">
                <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-bold text-white">{editMode ? 'Edit Batch' : 'New Batch'}</h3><button onClick={() => setShowBatchModal(false)} className="text-slate-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/5"><X size={20}/></button></div>
                <form onSubmit={handleBatchSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Batch Name *</label><input type="text" name="name" defaultValue={editData?.name} required className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500" /></div>
                        <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Logo Image (Optional)</label>
                        <input type="file" name="logo" className="w-full bg-black/20 border border-white/10 rounded-xl p-2.5 text-white" onChange={(e) => setSelectedLogoName(e.target.files[0]?.name || "")} />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-slate-300 mb-2 block">Batch Type *</label>
                            <select name="type" defaultValue={editData?.type || "1"} required className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500">
                                <option value="1" className="bg-slate-800">Theory only</option><option value="2" className="bg-slate-800">Paper only</option><option value="3" className="bg-slate-800">Theory and Paper</option><option value="4" className="bg-slate-800">Others</option>
                            </select>
                        </div>
                        <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Display Order</label><input type="number" name="itemOrder" defaultValue={editData?.itemOrder || "1"} className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500" /></div>
                        <div className="md:col-span-2"><label className="text-sm font-semibold text-slate-300 mb-2 block">Description</label><textarea name="description" defaultValue={editData?.description} rows="2" className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500"></textarea></div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 text-lg rounded-2xl shadow-lg mt-4">{editMode ? 'Update Batch' : 'Create Batch'}</button>
                </form>
              </div>
          </div>
      )}

      {showGroupModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in fade-in duration-200">
              <div className="bg-slate-800/90 border border-white/10 rounded-3xl p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar backdrop-blur-2xl">
                <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-bold text-white">{editMode ? 'Edit Payment Group' : 'New Payment Group'}</h3><button onClick={() => setShowGroupModal(false)} className="text-slate-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/5"><X size={20}/></button></div>
                <form onSubmit={handleGroupSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Group Name *</label><input type="text" name="name" defaultValue={editData?.name} placeholder="e.g. 2026 Monthly Jan" required className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500" /></div>
                        <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Order Number</label><input type="number" name="itemOrder" defaultValue={editData?.itemOrder || "1"} className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500" /></div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-semibold text-slate-300 mb-2 block">Payment Type *</label>
                            <select name="paymentType" defaultValue={editData?.type === 1 ? "Monthly" : "Full Payment"} required onChange={(e) => { document.getElementById('discountRulesSection').style.display = e.target.value === 'Full Payment' ? 'block' : 'none'; }} className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500 cursor-pointer">
                                <option value="Monthly" className="bg-slate-800">Monthly Payment</option><option value="Full Payment" className="bg-slate-800">Full Payment</option>
                            </select>
                        </div>
                    </div>
                    <div id="discountRulesSection" style={{display: (editData?.type === 2 || (!editMode && discountRules.length > 0)) ? 'block' : 'none'}} className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <div><h4 className="text-lg font-bold text-blue-400">Bundle Discount Rules</h4></div>
                            <button type="button" onClick={addDiscountRule} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"><Plus size={18}/> Rule</button>
                        </div>
                        <div className="space-y-4">
                            {discountRules.map((rule, idx) => (
                                <div key={idx} className="flex gap-4 items-end bg-black/20 p-4 rounded-xl border border-white/10">
                                    <div className="flex-1"><label className="text-xs font-semibold text-slate-400 mb-2 block uppercase tracking-wider">Subject Count:</label><input type="number" value={rule.courseCount} onChange={(e) => handleDiscountRuleChange(idx, 'courseCount', e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500" /></div>
                                    <div className="flex-1"><label className="text-xs font-semibold text-slate-400 mb-2 block uppercase tracking-wider">Price/Subject:</label><input type="number" value={rule.pricePerCourse} onChange={(e) => handleDiscountRuleChange(idx, 'pricePerCourse', e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500" /></div>
                                    <button type="button" onClick={() => removeDiscountRule(idx)} className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white p-3 rounded-xl transition-colors"><Trash2 size={20}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 text-lg rounded-2xl shadow-lg mt-4">{editMode ? 'Update Group' : 'Create Group'}</button>
                </form>
              </div>
          </div>
      )}

      {showInstallmentModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in fade-in duration-200">
              <div className="bg-slate-800/90 border border-white/10 rounded-3xl p-8 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar backdrop-blur-2xl">
                <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-bold text-white flex items-center gap-3"><CreditCard className="text-orange-500"/> Setup Installments</h3><button onClick={() => setShowInstallmentModal(false)} className="text-slate-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/5"><X size={20}/></button></div>
                
                {existingInstallments.length > 0 && (
                    <div className="mb-6 bg-white/5 border border-white/10 rounded-2xl p-4">
                        <h4 className="text-sm font-bold text-orange-400 mb-3">Existing Installment Plans</h4>
                        <div className="space-y-3">
                            {existingInstallments.map(plan => (
                                <div key={plan.id} className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-white/5">
                                    <div>
                                        <span className="font-bold text-white text-lg">Trigger: {plan.subjectCount} Subjects</span>
                                        <span className="text-sm text-slate-400 ml-3">({JSON.parse(plan.details).length} Steps)</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => handleEditInstallment(plan)} className="text-blue-400 hover:bg-blue-500 hover:text-white p-2 rounded-lg transition-colors"><Edit3 size={18}/></button>
                                        <button type="button" onClick={() => handleDeleteInstallment(plan.id)} className="text-red-400 hover:bg-red-500 hover:text-white p-2 rounded-lg transition-colors"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <form onSubmit={handleInstallmentSubmit} className="space-y-6">
                    <div className="bg-black/20 p-6 rounded-2xl border border-white/5">
                        <label className="text-sm font-semibold text-slate-300 mb-2 block">Trigger Subject Count * (e.g. 3)</label>
                        <input type="number" name="subjectCount" value={installmentSubjectCount} onChange={(e) => setInstallmentSubjectCount(e.target.value)} placeholder="Number of subjects needed to trigger installment" required className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-orange-500" />
                    </div>
                    
                    <div className="bg-orange-500/10 p-6 rounded-2xl border border-orange-500/20">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-lg font-bold text-orange-400">Installment Steps</h4>
                            <button type="button" onClick={addInstallmentStep} className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"><Plus size={18}/> Add Step</button>
                        </div>
                        <div className="space-y-3">
                            {installmentSteps.map((step, idx) => (
                                <div key={idx} className="flex gap-4 items-center bg-black/40 p-4 rounded-xl border border-white/10">
                                    <div className="font-bold text-slate-400 w-16">Step {step.step}:</div>
                                    <div className="flex-1">
                                        <label className="text-xs text-slate-400 mb-1 block">Amount (Rs) *</label>
                                        <input type="number" required value={step.amount} onChange={(e) => { const newSteps=[...installmentSteps]; newSteps[idx].amount=e.target.value; setInstallmentSteps(newSteps); }} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-orange-500" />
                                    </div>
                                    <div className="w-32">
                                        <label className="text-xs text-slate-400 mb-1 block" title="Gap from previous payment">Gap (Days) *</label>
                                        <input type="number" required value={step.gapDays} onChange={(e) => { const newSteps=[...installmentSteps]; newSteps[idx].gapDays=e.target.value; setInstallmentSteps(newSteps); }} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-orange-500" />
                                    </div>
                                    {installmentSteps.length > 1 && (
                                        <button type="button" onClick={() => removeInstallmentStep(idx)} className="mt-5 text-red-400 hover:bg-red-500 hover:text-white p-3 rounded-xl transition-colors"><Trash2 size={20}/></button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-4 text-lg rounded-2xl shadow-lg mt-4">
                        {editInstallmentId ? 'Update Installment Plan' : 'Save Installment Plan'}
                    </button>
                </form>
              </div>
          </div>
      )}

      {/* 🔥 ADD/EDIT SUBJECT MODAL 🔥 */}
      {showCourseModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in fade-in duration-200">
              <div className="bg-slate-800/90 border border-white/10 rounded-3xl p-8 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar backdrop-blur-2xl">
                <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-bold text-white">{editMode ? 'Edit Subject' : 'New Subject'}</h3><button onClick={() => setShowCourseModal(false)} className="text-slate-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/5"><X size={20}/></button></div>
                <form onSubmit={handleCourseSubmit} className="space-y-6">
                    {(activeBusiness?.category === 'Advance Level' || activeBusiness?.category === 'AL') && (
                        <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-2xl mb-4">
                            <label className="text-sm font-semibold text-blue-300 mb-3 block">Select A/L Streams (Can select multiple) *</label>
                            <div className="flex flex-wrap gap-4">
                                {getBatchStreams().map(s => (
                                    <label key={s} className="flex items-center gap-2 cursor-pointer text-white font-medium bg-black/20 p-2 rounded-lg border border-white/10 hover:bg-white/10">
                                        <input type="checkbox" name="streams" value={s} defaultChecked={editData?.streams?.includes(s) || editData?.stream === s} className="w-4 h-4"/> {s}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* 🔥 LECTURER NAME FIELD 🔥 */}
                        <div>
                            <label className="text-sm font-semibold text-slate-300 mb-2 block">Lecturer Name (Optional)</label>
                            <input type="text" name="lecturerName" defaultValue={editData?.lecturerName} placeholder="e.g. Dr. Kamal" className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500" />
                        </div>

                        <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Subject Name *</label><input type="text" name="name" defaultValue={editData?.name} required className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500" /></div>
                        <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Subject Code (Optional)</label><input type="text" name="code" defaultValue={editData?.code} className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500" /></div>
                        <div className="md:col-span-2"><label className="text-sm font-semibold text-slate-300 mb-2 block">Description</label><textarea name="description" defaultValue={editData?.description} rows="2" className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500"></textarea></div>
                        
                        {/* 🔥 DISCOUNT EXCLUDE CHECKBOX 🔥 */}
                        <div className="md:col-span-2 mt-2">
                            <label className="flex items-start gap-3 cursor-pointer group bg-orange-500/10 p-4 rounded-xl border border-orange-500/20 hover:bg-orange-500/20 transition-colors">
                                <input type="checkbox" name="isDiscountExcluded" value="true" defaultChecked={editData?.isDiscountExcluded} className="w-5 h-5 accent-orange-500 mt-0.5 shrink-0" />
                                <div>
                                    <span className="text-sm font-bold text-orange-400 group-hover:text-orange-300">Exclude from Bundle Discounts</span>
                                    <p className="text-[10px] text-orange-200/60 mt-1 leading-tight">If ticked, this subject will NOT be counted for bundle discounts when students enroll.</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 mt-4">
                        <h4 className="text-lg font-bold text-slate-200 mb-6">Assign to Groups, Pricing & Tutes *</h4>
                        <div className="space-y-4">
                            {activeBatch?.groups?.length === 0 ? <p className="text-red-400 text-sm font-medium bg-red-500/10 p-4 rounded-xl border border-red-500/20">Create Groups first!</p> : 
                            activeBatch?.groups?.map(g => (
                                <div key={g.id} className={`flex flex-col p-5 rounded-2xl border transition-all ${selectedGroupPrices[g.id] !== undefined ? 'bg-blue-500/10 border-blue-500/40' : 'bg-black/20 border-white/5 hover:border-white/20'}`}>
                                    <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 w-full">
                                        <label className="flex items-center gap-4 cursor-pointer min-w-[200px] group">
                                            <input type="checkbox" checked={selectedGroupPrices[g.id] !== undefined} onChange={() => toggleGroupPrice(g.id)} className="hidden" />
                                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${selectedGroupPrices[g.id] !== undefined ? 'bg-blue-500 border-blue-500' : 'border-slate-500 group-hover:border-slate-400'}`}>{selectedGroupPrices[g.id] !== undefined && <CheckCircle size={14} className="text-white"/>}</div>
                                            <span className="text-base font-bold text-slate-300 group-hover:text-white transition-colors">{g.name}</span>
                                        </label>
                                        
                                        {/* 🔥 PRICING & TUTE TOGGLE 🔥 */}
                                        {selectedGroupPrices[g.id] !== undefined && (
                                            <div className="flex-1 w-full flex flex-col sm:flex-row items-center gap-3 animate-in fade-in duration-200">
                                                <input type="number" required placeholder={`Price (LKR)`} value={selectedGroupPrices[g.id].price} onChange={(e) => updateGroupData(g.id, 'price', e.target.value)} className="w-full sm:w-1/2 bg-slate-900 border border-blue-500/50 rounded-xl p-3 text-white text-base font-bold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20" />
                                                
                                                <label className="flex items-center justify-center gap-2 cursor-pointer bg-orange-500/10 border border-orange-500/30 px-4 py-3 rounded-xl hover:bg-orange-500/20 transition-colors w-full sm:w-1/2 h-full">
                                                    <input type="checkbox" checked={selectedGroupPrices[g.id].deliverTute} onChange={(e) => updateGroupData(g.id, 'deliverTute', e.target.checked)} className="accent-orange-500 w-4 h-4" />
                                                    <span className="text-xs font-bold text-orange-400 uppercase tracking-widest whitespace-nowrap">Deliver Tute</span>
                                                </label>
                                            </div>
                                        )}
                                    </div>

                                    {/* 🔥 TUTE NAME AND COVER (SHOWN IF DELIVER TUTE IS CHECKED) 🔥 */}
                                    {selectedGroupPrices[g.id] !== undefined && selectedGroupPrices[g.id].deliverTute && (
                                        <div className="mt-4 pt-4 border-t border-blue-500/20 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                            <div>
                                                <label className="text-xs text-slate-400 mb-1 block uppercase tracking-widest font-semibold">Tute Name (Optional)</label>
                                                <input type="text" placeholder="e.g. Mechanics Part 1" value={selectedGroupPrices[g.id].tuteName} onChange={(e) => updateGroupData(g.id, 'tuteName', e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-orange-500" />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400 mb-1 block uppercase tracking-widest font-semibold">Tute Cover (Optional)</label>
                                                <input type="file" accept="image/*" onChange={(e) => updateGroupData(g.id, 'tuteFile', e.target.files[0])} className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-sm text-slate-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-white/10 file:text-white cursor-pointer" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 text-lg rounded-2xl shadow-lg mt-4">{editMode ? 'Update Subject' : 'Save Subject'}</button>
                </form>
              </div>
          </div>
      )}

      {/* 🔥 ADD/EDIT FOLDER MODAL 🔥 */}
      {showLessonGroupModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in fade-in duration-200">
              <div className="bg-slate-800/90 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl backdrop-blur-2xl">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-bold text-white">{editMode ? 'Edit Folder' : 'New Folder'}</h3>
                      <button onClick={() => setShowLessonGroupModal(false)} className="text-slate-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/5"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleLessonGroupSubmit} className="space-y-6">
                      <div>
                          <label className="text-sm font-semibold text-slate-300 mb-2 block">Folder Title *</label>
                          <input type="text" name="title" defaultValue={editData?.title || editData?.name} required className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500" />
                      </div>
                      <div>
                          <label className="text-sm font-semibold text-slate-300 mb-2 block">Display Order</label>
                          <input type="number" name="order" defaultValue={editData?.itemOrder || "1"} className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500" />
                      </div>
                      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 text-lg rounded-2xl shadow-lg mt-4">
                          {editMode ? 'Update Folder' : 'Create Folder'}
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* PREVIEW MODAL */}
      {previewData && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
              <div className="bg-slate-800/90 border border-white/10 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden backdrop-blur-2xl">
                  <div className="p-6 border-b border-white/10 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-white flex items-center gap-3"><MonitorPlay size={24} className="text-blue-400"/> {previewData.title}</h3>
                      <div className="flex gap-3">
                          <a href={previewData.link || `http://72.62.249.211:5000/documents/${previewData.fileName}`} target="_blank" rel="noreferrer" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                              <ExternalLink size={18}/> Open External
                          </a>
                          <button onClick={() => setPreviewData(null)} className="text-slate-400 hover:text-white bg-white/5 hover:bg-red-500 border border-white/5 p-2.5 rounded-xl transition-colors"><X size={20}/></button>
                      </div>
                  </div>
                  <div className="flex-1 bg-black/40 p-4 relative flex items-center justify-center">
                      {previewData.fileName ? (
                          <iframe src={`http://72.62.249.211:5000/documents/${previewData.fileName}`} className="w-full h-full rounded-2xl bg-white" title="Document Preview" />
                      ) : previewData.link ? (
                          <iframe src={getEmbedUrl(previewData.link)} className="w-full h-full rounded-2xl bg-black border border-white/10" title="Video/Live Preview" allowFullScreen />
                      ) : (
                          <div className="text-center text-slate-500"><Ban size={48} className="mx-auto mb-4 opacity-50"/><p className="text-lg font-medium">No preview available.</p></div>
                      )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}