import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Loader2, FolderOpen, Layers, BookOpen, Plus, ChevronRight, ArrowLeft, Building2, MonitorPlay, MessageSquare, Send, CreditCard, FolderPlus, Users } from 'lucide-react';
import api from '../../../api/axios'; 
import ContentHubViews from './ContentHubViews';
import ContentHubModals from './ContentHubModals';

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
  const [showLecturerModal, setShowLecturerModal] = useState(false);
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
                  setManagersList(extractArray(mgrRes.data)); 
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
          formData.set('streams', streams.join(','));
      }
      formData.set('isDiscountEnabledForInstallments', formData.get('isDiscountEnabledForInstallments') ? 1 : 0);

      try {
          if(editMode) { formData.set('businessId', editData.id); await api.put('/admin/business/update', formData); } 
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
      formData.set('business_id', activeBusiness.id);
      try {
          if(editMode) { formData.set('batch_id', editData.id); await api.put('/admin/batch/update', formData); } 
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

  const handleLecturerSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const name = formData.get('name');
      const phone = formData.get('phone');
      let currentLecturers = [];
      try { currentLecturers = JSON.parse(activeBatch?.lecturers || '[]'); } catch(e){}
      
      if(editMode) { currentLecturers[editData.index] = { name, phone }; } 
      else { currentLecturers.push({ name, phone }); }
      
      try {
          await api.put('/admin/batch/lecturers', { batch_id: activeBatch.id, lecturers: currentLecturers });
          toast.success(editMode ? "Lecturer Updated!" : "Lecturer Added!");
          setShowLecturerModal(false);
          refreshBatches(activeBusiness.id);
      } catch(e) { toast.error("Failed to save Lecturer"); }
  };

  const handleDeleteLecturer = async (index) => {
      if(!window.confirm("Are you sure you want to delete this Lecturer?")) return;
      let currentLecturers = [];
      try { currentLecturers = JSON.parse(activeBatch?.lecturers || '[]'); } catch(e){}
      currentLecturers.splice(index, 1);
      try {
          await api.put('/admin/batch/lecturers', { batch_id: activeBatch.id, lecturers: currentLecturers });
          toast.success("Lecturer Deleted!");
          refreshBatches(activeBusiness.id);
      } catch(e) { toast.error("Failed to delete Lecturer"); }
  };

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

      keys.forEach(k => {
          if (selectedGroupPrices[k].tuteFile) {
              formData.set(`tuteCover_${k}`, selectedGroupPrices[k].tuteFile);
          }
      });

      formData.set('course_id', editData?.id || '');
      formData.set('stream', selectedStreams.length > 0 ? selectedStreams[0] : '');
      formData.set('streams', JSON.stringify(selectedStreams));
      formData.set('itemOrder', formData.get('itemOrder') || 1);
      formData.set('courseType', 1);
      formData.set('groupPricing', JSON.stringify(formattedPrices));
      formData.set('groupPrices', JSON.stringify(formattedPrices));
      formData.set('isDiscountExcluded', excludeDiscount);
      formData.set('batch_id', activeBatch.id);
      
      try {
          if(editMode) { 
              formData.set('price', formattedPrices[0].price); 
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
      formData.set('type', contentType);
      formData.set('batch_id', activeBatch.id);

      if(!editMode) formData.set('selectedCourses', JSON.stringify(massAssignSubjects));
      if(editMode && editData?.id) formData.set('content_id', editData.id);

      try {
          if (editMode) await api.put('/admin/manager/contents/update', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
          else await api.post('/admin/manager/contents/mass-assign', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
          toast.success("Content Saved!");
          setShowContentModal(false); if(activeSubject) fetchContents(activeSubject, activeBatch); 
      } catch (error) { toast.error("Failed to process content"); }
  };

  const stateData = {
    isSystemAdmin, isManager, isStaff, canManageBusiness, canManageBatches, canManageGroupsAndSubjects, canManageContent,
    viewLevel, activeBusiness, activeBatch, batchTab, activeSubject, contentTab, businesses, managersList, batches, uniqueSubjects,
    lessonGroups, subjectContents, postsList, showBusinessModal, showAssignModal, showBatchModal, showGroupModal, showCourseModal,
    showLessonGroupModal, showContentModal, showPostModal, showManagePostsModal, previewData, editMode, editData, selectedLogoName,
    selectedGroupPrices, discountRules, contentType, prefilledFolder, selectedBatchesForContent, massAssignSubjects, openFolders,
    postBizId, postBatches, showInstallmentModal, existingInstallments, editInstallmentId, installmentSubjectCount, installmentSteps, groupedSubjects, loading, showLecturerModal
  };

  const actionsData = {
    handleBack, openBusinessDetails, openBatchDetails, openContentsView, getImageUrl, getPostImageUrl, getManagerName,
    getBatchStreams, toggleBusinessStatus, toggleBatchStatus, deleteItem, openInstallmentModal, handleEditInstallment,
    handleDeleteInstallment, handleInstallmentSubmit, handlePostSubmit, openPostModal, handleBusinessSubmit, handleAssignManagers,
    handleBatchSubmit, handleGroupSubmit, handleCourseSubmit, handleLessonGroupSubmit, handleMassAssignSubmit, setEditMode,
    setSelectedLogoName, setShowBusinessModal, setShowAssignModal, setShowBatchModal, setShowGroupModal, setShowCourseModal,
    setShowLessonGroupModal, setShowContentModal, setShowPostModal, setShowManagePostsModal, setPreviewData, setContentType,
    setPrefilledFolder, setSelectedBatchesForContent, setMassAssignSubjects, toggleFolder, addDiscountRule, removeDiscountRule,
    handleDiscountRuleChange, addInstallmentStep, removeInstallmentStep, toggleGroupPrice, updateGroupData, toggleMassAssignSubject,
    fetchPosts, setPostBizId, setBatchTab, setContentTab, getTypeInt, getEmbedUrl, isMatchedType, getFolderId, setShowInstallmentModal, 
    setInstallmentSubjectCount, setInstallmentSteps, setEditInstallmentId, setEditData, setDiscountRules, setSelectedGroupPrices,
    setShowLecturerModal, handleLecturerSubmit, handleDeleteLecturer
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 size={50} className="animate-spin text-blue-500" /></div>;

  return (
    <div className="w-full text-slate-200 animate-in fade-in duration-500 flex flex-col font-sans pb-4">
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
                          {batchTab === 'lecturers' && <button onClick={() => { setEditMode(false); setShowLecturerModal(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-semibold text-base flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"><Plus size={20}/> New Lecturer</button>}
                      </>
                  )}
                  {viewLevel === 'contents' && canManageContent && (
                      <>
                          <button onClick={() => { setShowLessonGroupModal(true); setEditMode(false); }} className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl font-semibold text-base flex items-center gap-2 transition-colors border border-white/10"><FolderPlus size={20}/> Add Folder</button>
                          <button onClick={() => { 
                              setShowContentModal(true); setContentType(''); setPrefilledFolder(''); setEditMode(false); 
                              setSelectedBatchesForContent([activeBatch.id]); 
                          }} className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-2xl font-semibold text-base flex items-center gap-2 transition-colors shadow-lg shadow-green-500/20"><Plus size={20}/> Add Content</button>
                      </>
                  )}
              </div>
          </div>
      </div>

      <ContentHubViews state={stateData} actions={actionsData} />
      <ContentHubModals state={stateData} actions={actionsData} />
    </div>
  );
}