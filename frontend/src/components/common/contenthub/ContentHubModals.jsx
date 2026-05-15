import React from 'react';
import { X, Send, UploadCloud, Users, CheckCircle, Plus, Edit3, Trash2, CreditCard, MessageSquare, MonitorPlay, ExternalLink, Ban, BookOpen, Building2, User, Layers } from 'lucide-react';
import api from '../../../api/axios'; 

export default function ContentHubModals({ state, actions }) {
    const {
        isSystemAdmin, businesses, managersList, batches, lessonGroups, postsList, showBusinessModal, showAssignModal, showBatchModal, showGroupModal,
        showCourseModal, showLessonGroupModal, showContentModal, showPostModal, showManagePostsModal, previewData, editMode, editData, selectedLogoName,
        selectedGroupPrices, discountRules, contentType, prefilledFolder, selectedBatchesForContent, massAssignSubjects, postBizId, postBatches, showInstallmentModal,
        existingInstallments, editInstallmentId, installmentSubjectCount, installmentSteps, activeBusiness, activeBatch, loading, showLecturerModal
    } = state;

    const {
        setShowBusinessModal, setShowAssignModal, setShowBatchModal, setShowGroupModal, setShowCourseModal, setShowLessonGroupModal, setShowContentModal,
        setShowPostModal, setShowManagePostsModal, setPreviewData, setSelectedLogoName, setContentType, setPostBizId,
        handlePostSubmit, handleBusinessSubmit, handleAssignManagers, handleBatchSubmit, handleGroupSubmit, handleCourseSubmit, handleLessonGroupSubmit, handleMassAssignSubmit,
        getPostImageUrl, getEmbedUrl, deleteItem, fetchPosts, addDiscountRule, removeDiscountRule, handleDiscountRuleChange, addInstallmentStep, removeInstallmentStep,
        toggleGroupPrice, updateGroupData, toggleMassAssignSubject, getTypeInt, setPrefilledFolder, setSelectedBatchesForContent, setMassAssignSubjects,
        setShowInstallmentModal, handleEditInstallment, handleDeleteInstallment, handleInstallmentSubmit, setInstallmentSubjectCount, setInstallmentSteps, setEditInstallmentId, getBatchStreams,
        setEditData, setDiscountRules, setSelectedGroupPrices, setShowLecturerModal, handleLecturerSubmit
    } = actions;

    // 🔥 FIX: Backend API Base URL eka dynamic gannawa
    const getBaseUrl = () => {
        let url = api.defaults.baseURL || 'https://imacampus.online/api';
        return url.endsWith('/') ? url.slice(0, -1) : url;
    };

    return (
        <>
            {/* ADD CONTENT MODAL */}
            {showContentModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white/5 dark:bg-brand-darkCard border border-white/10 dark:border-brand-darkBorder rounded-[2rem] w-full max-w-7xl max-h-[95vh] flex flex-col shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] overflow-hidden backdrop-blur-3xl">
                        <div className="p-6 md:p-8 border-b border-white/10 flex justify-between items-center bg-black/20 dark:bg-white/5 rounded-t-[2rem]">
                            <h3 className="text-2xl font-extrabold text-white flex items-center gap-3 drop-shadow-sm"><Plus className="text-green-400" size={28}/> {editMode ? 'Edit Content' : 'Add Content (Multi-Batch)'}</h3>
                            <button onClick={() => { setShowContentModal(false); setContentType(''); setPrefilledFolder(''); setMassAssignSubjects([]); setSelectedBatchesForContent([]); }} className="text-gray-400 hover:text-white bg-white/5 border border-white/10 p-2.5 rounded-xl transition-all hover:bg-red-500/20 hover:border-red-500/30 outline-none"><X size={20}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                            <form onSubmit={handleMassAssignSubmit} className="space-y-8 max-w-6xl mx-auto">
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Content Type *</label>
                                        <select value={contentType} onChange={e => setContentType(e.target.value)} disabled={editMode} className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-green-500 disabled:opacity-50 shadow-inner cursor-pointer appearance-none">
                                            <option value="" disabled className="bg-slate-800 text-white">Select Type</option>
                                            <option value="live" className="bg-slate-800 text-white">Live Class</option><option value="recording" className="bg-slate-800 text-white">Recording</option>
                                            <option value="document" className="bg-slate-800 text-white">Document / PDF</option><option value="sPaper" className="bg-slate-800 text-white">Structured Paper</option><option value="paper" className="bg-slate-800 text-white">MCQ Paper</option>
                                        </select>
                                    </div>
                                    
                                    {contentType && (
                                        <div className="flex-1 animate-in fade-in duration-300">
                                            <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Target Folder (Current Batch Only)</label>
                                            <select name="contentGroupId" defaultValue={editMode ? (editData?.content_group_id || "") : prefilledFolder} className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-green-500 shadow-inner cursor-pointer appearance-none">
                                                <option value="" className="bg-slate-800 text-white">No Folder (Uncategorized)</option>
                                                {lessonGroups.filter(g => parseInt(g.type) === getTypeInt(contentType)).map(folder => (
                                                    <option key={folder.id} value={folder.id} className="bg-slate-800 text-white">{folder.title || folder.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {contentType && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white/5 p-6 md:p-8 rounded-[2rem] border border-white/10 shadow-sm">
                                            <div className="md:col-span-3">
                                                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Title *</label>
                                                <input type="text" name="title" defaultValue={editData?.title} required className="w-full bg-black/30 border border-white/10 focus:border-green-500 focus:bg-black/50 rounded-xl p-4 text-white outline-none shadow-inner transition-all" />
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Display Order *</label>
                                                <input type="number" name="itemOrder" defaultValue={editData?.itemOrder || 1} required className="w-full bg-black/30 border border-white/10 focus:border-green-500 focus:bg-black/50 rounded-xl p-4 text-white outline-none shadow-inner transition-all" />
                                            </div>
                                            
                                            {(contentType === 'live' || contentType === 'recording') && (
                                                <div className="md:col-span-4">
                                                    <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">URL Link *</label>
                                                    <input type="url" name="link" defaultValue={editData?.link} required className="w-full bg-black/30 border border-white/10 focus:border-green-500 focus:bg-black/50 rounded-xl p-4 text-white outline-none shadow-inner transition-all" />
                                                </div>
                                            )}

                                            {contentType === 'recording' && (
                                                <div className="md:col-span-4">
                                                    <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Meeting ID</label>
                                                    <input type="text" name="zoomMeetingId" defaultValue={editData?.meetingId} className="w-full bg-black/30 border border-white/10 focus:border-green-500 focus:bg-black/50 rounded-xl p-4 text-white outline-none shadow-inner transition-all" />
                                                </div>
                                            )}

                                            {(contentType === 'live' || contentType === 'recording') && (
                                                <div className="md:col-span-4">
                                                    <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Thumbnail Image (Optional) {editMode && <span className="text-green-400 font-normal ml-2 normal-case">(Leave empty to keep existing)</span>}</label>
                                                    <input type="file" name="thumbnail" accept="image/*" className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-gray-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:bg-white/10 file:text-white shadow-inner cursor-pointer" />
                                                </div>
                                            )}

                                            {(contentType === 'document' || contentType === 'sPaper' || contentType === 'paper') && (
                                                <div className="md:col-span-4">
                                                    <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">File Upload {editMode && <span className="text-green-400 font-normal ml-2 normal-case">(Leave empty to keep existing)</span>}</label>
                                                    <input type="file" name="file" required={!editMode} className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-gray-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:bg-white/10 file:text-white shadow-inner cursor-pointer" />
                                                </div>
                                            )}

                                            <div className="md:col-span-4">
                                                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Date</label>
                                                <input type={(contentType==='document'||contentType==='sPaper'||contentType==='paper') ? "month":"date"} name="date" defaultValue={editData?.date ? editData.date.split('T')[0] : ''} required className="w-full bg-black/30 border border-white/10 focus:border-green-500 focus:bg-black/50 rounded-xl p-4 text-white outline-none shadow-inner cursor-pointer transition-all appearance-none" />
                                            </div>

                                            {contentType === 'live' && (
                                                <>
                                                    <div className="md:col-span-2"><label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Start Time</label><input type="time" name="startTime" defaultValue={editData?.startTime} className="w-full bg-black/30 border border-white/10 focus:border-green-500 focus:bg-black/50 rounded-xl p-4 text-white outline-none shadow-inner cursor-pointer transition-all appearance-none" /></div>
                                                    <div className="md:col-span-2"><label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">End Time</label><input type="time" name="endTime" defaultValue={editData?.endTime} className="w-full bg-black/30 border border-white/10 focus:border-green-500 focus:bg-black/50 rounded-xl p-4 text-white outline-none shadow-inner cursor-pointer transition-all appearance-none" /></div>
                                                </>
                                            )}

                                            {contentType === 'paper' && (
                                                <>
                                                    <div className="md:col-span-2"><label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Time (Min) *</label><input type="number" name="paperTime" defaultValue={editData?.paperTime} required className="w-full bg-black/30 border border-white/10 focus:border-green-500 focus:bg-black/50 rounded-xl p-4 text-white outline-none shadow-inner transition-all" /></div>
                                                    <div className="md:col-span-2"><label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Questions *</label><input type="number" name="questionCount" defaultValue={editData?.questionCount} required className="w-full bg-black/30 border border-white/10 focus:border-green-500 focus:bg-black/50 rounded-xl p-4 text-white outline-none shadow-inner transition-all" /></div>
                                                </>
                                            )}
                                            
                                            <div className="md:col-span-4 mt-4">
                                                <label className="flex items-center gap-4 cursor-pointer w-max group bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all shadow-sm">
                                                    <div className="relative flex items-center justify-center">
                                                        <input type="checkbox" name="isFree" value="1" defaultChecked={editData?.isFree} className="peer w-6 h-6 appearance-none bg-black/40 border-2 border-slate-600 rounded-lg checked:bg-green-500 checked:border-green-500 transition-colors" />
                                                        <CheckCircle size={16} className="text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"/>
                                                    </div>
                                                    <span className="text-base font-bold text-slate-200 group-hover:text-white transition-colors">Mark as Free Content (Open for all)</span>
                                                </label>
                                            </div>
                                        </div>

                                        <input type="hidden" name="selectedCourses" value={JSON.stringify(massAssignSubjects)} />
                                        
                                        <div className="pt-8 border-t border-white/10 mt-8">
                                            <div className="flex justify-between items-end mb-6">
                                                <h4 className="text-xl font-extrabold text-white flex items-center gap-3 drop-shadow-sm"><BookOpen size={24} className="text-blue-400"/> Assign to Subjects</h4>
                                            </div>

                                            <div className="bg-black/30 p-6 md:p-8 rounded-[2rem] mb-6 border border-white/10 shadow-inner">
                                                <label className="text-xs font-bold text-gray-400 mb-4 block uppercase tracking-wider">Share with multiple Batches (Merge Content):</label>
                                                <div className="flex flex-wrap gap-4">
                                                    {batches.map(b => (
                                                        <label key={`b-sel-${b.id}`} className={`flex items-center gap-3 px-5 py-3 rounded-xl cursor-pointer transition-all border shadow-sm ${selectedBatchesForContent.includes(b.id) ? 'bg-blue-500/20 border-blue-500/50 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-300'}`}>
                                                            <input type="checkbox" className="hidden" 
                                                                   checked={selectedBatchesForContent.includes(b.id)} 
                                                                   onChange={(e) => {
                                                                       if(e.target.checked) setSelectedBatchesForContent([...selectedBatchesForContent, b.id]);
                                                                       else setSelectedBatchesForContent(selectedBatchesForContent.filter(id => id !== b.id));
                                                                   }} 
                                                            />
                                                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors ${selectedBatchesForContent.includes(b.id) ? 'bg-blue-500 border-blue-500' : 'border-slate-500'}`}>
                                                                {selectedBatchesForContent.includes(b.id) && <CheckCircle size={12} className="text-white"/>}
                                                            </div>
                                                            <span className="font-bold text-sm">{b.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="bg-white/5 rounded-[2rem] p-6 md:p-8 border border-white/10 space-y-8 shadow-sm">
                                                {batches.filter(b => selectedBatchesForContent.includes(b.id)).map(selectedBatch => (
                                                    <div key={`batch-group-${selectedBatch.id}`} className="mb-6">
                                                        <h4 className="text-xl font-extrabold text-blue-400 mb-6 border-b border-white/10 pb-3 drop-shadow-sm">{selectedBatch.name}</h4>
                                                        
                                                        {selectedBatch.groups?.length === 0 && <p className="text-sm text-slate-500 font-medium">No groups in this batch.</p>}

                                                        {selectedBatch.groups?.map((group, gIdx) => (
                                                            <div key={`g-assign-${gIdx}`} className="mb-8 ml-2 md:ml-6">
                                                                <h5 className="text-lg font-bold text-slate-200 mb-4">{group.name} <span className="text-[10px] font-bold text-slate-400 bg-white/10 px-3 py-1 rounded-lg ml-3 border border-white/10 uppercase tracking-wider shadow-inner">{group.type === 1 ? 'Monthly' : 'Full'}</span></h5>
                                                                
                                                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                                    {group.courses?.map((course, cIdx) => (
                                                                        <label key={`c-assign-${cIdx}`} className={`flex items-center gap-4 cursor-pointer p-4 rounded-2xl border transition-all shadow-sm group ${massAssignSubjects.includes(course.id) ? 'bg-blue-600/20 border-blue-500/50' : 'bg-black/20 border-white/10 hover:border-white/30 hover:bg-white/5'}`}>
                                                                            <div className="relative flex items-center justify-center shrink-0">
                                                                                <input type="checkbox" checked={massAssignSubjects.includes(course.id)} onChange={() => toggleMassAssignSubject(course.id)} className="peer w-6 h-6 appearance-none bg-black/40 border-2 border-slate-600 rounded-lg checked:bg-blue-500 checked:border-blue-500 transition-colors" />
                                                                                <CheckCircle size={16} className="text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"/>
                                                                            </div>
                                                                            <span className={`text-sm font-bold truncate transition-colors ${massAssignSubjects.includes(course.id) ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{course.name}</span>
                                                                        </label>
                                                                    ))}
                                                                    {group.courses?.length === 0 && <p className="text-xs text-slate-500 font-medium">No subjects in this group.</p>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pt-6 pb-4">
                                            <button type="submit" className="w-full bg-green-600/90 hover:bg-green-500 text-white font-extrabold text-lg py-4 rounded-2xl shadow-[0_4px_15px_rgba(22,163,74,0.4)] mt-4 transition-transform hover:scale-[1.01] outline-none tracking-wide uppercase border border-transparent">
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

            {/* SETUP BUSINESS MODAL */}
            {showBusinessModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white/5 dark:bg-brand-darkCard border border-white/10 dark:border-brand-darkBorder rounded-[2rem] p-6 md:p-8 w-full max-w-6xl shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] flex flex-col max-h-[90vh] backdrop-blur-3xl">
                        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4 shrink-0">
                            <h3 className="text-2xl font-extrabold text-white flex items-center gap-3 drop-shadow-sm"><Building2 className="text-blue-400"/> {editMode ? 'Edit Business Configuration' : 'Setup New Business'}</h3>
                            <button onClick={() => setShowBusinessModal(false)} className="text-gray-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/10 transition-all hover:bg-red-500/20 hover:border-red-500/30 outline-none"><X size={20}/></button>
                        </div>
                        
                        <form onSubmit={handleBusinessSubmit} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                            <div className="flex flex-col lg:flex-row gap-10">
                                <div className="flex-1 space-y-6">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-white/10 pb-2 drop-shadow-sm">Basic Information</h4>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="col-span-2">
                                            <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Business Name *</label>
                                            <input type="text" name="name" defaultValue={editData?.name} required className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/40 transition-all shadow-inner" placeholder="e.g. Science Academy" />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Category *</label>
                                            <select name="category" defaultValue={editData?.category || "Advance Level"} required onChange={(e) => { document.getElementById('streamsDiv').style.display = (e.target.value === 'Advance Level' || e.target.value === 'AL') ? 'block' : 'none'; }} className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent cursor-pointer shadow-inner appearance-none">
                                                <option value="Advance Level" className="bg-slate-800 text-white">Advance Level</option>
                                                <option value="Ordinary Level" className="bg-slate-800 text-white">Ordinary Level</option>
                                                <option value="Others" className="bg-slate-800 text-white">Others</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Medium *</label>
                                            <select name="medium" defaultValue={editData?.isEnglish ? 'English' : 'Sinhala'} required className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent cursor-pointer shadow-inner appearance-none">
                                                <option value="Sinhala" className="bg-slate-800 text-white">Sinhala Medium</option>
                                                <option value="English" className="bg-slate-800 text-white">English Medium</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Description (Optional)</label>
                                        <textarea name="description" defaultValue={editData?.description} rows="4" className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/40 resize-none shadow-inner transition-all"></textarea>
                                    </div>
                                </div>

                                <div className="w-full lg:w-[450px] space-y-6 shrink-0">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-white/10 pb-2 drop-shadow-sm">Branding & Logic</h4>
                                    <div>
                                        <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Business Logo *</label>
                                        <label className="flex items-center justify-center h-28 border-2 border-dashed border-white/20 rounded-xl bg-black/20 cursor-pointer hover:bg-white/5 transition-colors hover:border-brand-accent/50 shadow-inner">
                                            <div className="flex flex-col items-center gap-2">
                                                <UploadCloud size={28} className="text-brand-accent drop-shadow-sm"/>
                                                <span className="text-xs text-slate-300 font-bold">{selectedLogoName || "Select Image File"}</span>
                                            </div>
                                            <input type="file" name="logo" accept="image/*" className="hidden" onChange={(e) => setSelectedLogoName(e.target.files[0]?.name || "")} />
                                        </label>
                                    </div>

                                    <div id="streamsDiv" style={{display: (editData?.category === 'Advance Level' || editData?.category === 'AL' || !editData) ? 'block' : 'none'}} className="bg-blue-500/10 p-5 rounded-2xl border border-blue-500/20 shadow-sm">
                                        <label className="text-xs font-extrabold text-blue-300 mb-4 block uppercase tracking-widest drop-shadow-sm">A/L Streams (Select all that apply)</label>
                                        <div className="flex flex-wrap gap-3">
                                            {['Art', 'Commerce', 'Tech', 'Bio', 'Maths'].map(s => (
                                                <label key={s} className="flex items-center gap-2 cursor-pointer text-white text-xs font-bold bg-black/30 px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors shadow-inner">
                                                    <input type="checkbox" name={`stream_${s}`} value={s} defaultChecked={editData?.streams?.includes(s)} className="w-4 h-4 accent-blue-500 transition-transform"/> {s}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="bg-orange-500/10 p-5 rounded-2xl border border-orange-500/20 shadow-sm">
                                        <label className="flex items-start gap-4 cursor-pointer group">
                                            <input type="checkbox" name="isDiscountEnabledForInstallments" value="1" defaultChecked={editData?.isDiscountEnabledForInstallments} className="w-6 h-6 accent-orange-500 mt-0.5 shrink-0 transition-transform"/>
                                            <div>
                                                <span className="text-sm font-extrabold text-white group-hover:text-orange-300 transition-colors drop-shadow-sm">Allow Installment Discounts?</span>
                                                <p className="text-[11px] text-orange-200/70 mt-1.5 font-bold leading-relaxed">If ticked, students paying via installments will still receive the bundle discount.</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-white/10 mt-6 shrink-0">
                                <button type="submit" className="w-full bg-brand-accent/90 hover:bg-brand-accent text-white font-extrabold py-4 text-lg rounded-2xl shadow-[0_4px_15px_rgba(225,29,72,0.4)] transition-transform hover:scale-[1.01] uppercase tracking-wide flex justify-center items-center gap-2 outline-none border border-transparent">
                                    {editMode ? 'Update Business Settings' : 'Initialize New Business'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ASSIGN MANAGERS MODAL */}
            {showAssignModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white/5 dark:bg-brand-darkCard border border-white/10 dark:border-brand-darkBorder rounded-[2rem] p-8 w-full max-w-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] flex flex-col backdrop-blur-3xl">
                        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                            <h3 className="text-2xl font-extrabold text-white flex items-center gap-3 drop-shadow-sm"><UserPlus className="text-blue-400"/> Assign Managers</h3>
                            <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/10 transition-all hover:bg-red-500/20 hover:border-red-500/30 outline-none"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleAssignManagers} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Head Manager</label>
                                    <select name="head_manager" defaultValue={editData?.head_manager_id || ""} className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-blue-500 shadow-inner cursor-pointer appearance-none">
                                        <option value="" className="bg-slate-800 text-white">-- Select Manager --</option>
                                        {managersList.filter(m => m.role === 'Manager' || m.role === 'MANAGER').map(m => <option key={m.id} value={m.id} className="bg-slate-800 text-white">{m.firstName} {m.lastName}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Assistant Manager</label>
                                    <select name="ass_manager" defaultValue={editData?.ass_manager_id || ""} className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-blue-500 shadow-inner cursor-pointer appearance-none">
                                        <option value="" className="bg-slate-800 text-white">-- Select Asst. Manager --</option>
                                        {managersList.filter(m => m.role === 'Ass Manager' || m.role === 'ASS_MANAGER').map(m => <option key={m.id} value={m.id} className="bg-slate-800 text-white">{m.firstName} {m.lastName}</option>)}
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-brand-accent/90 hover:bg-brand-accent text-white font-extrabold py-4 text-lg rounded-2xl shadow-[0_4px_15px_rgba(225,29,72,0.4)] transition-transform hover:scale-[1.01] uppercase tracking-wide outline-none border border-transparent">Assign Staff</button>
                        </form>
                    </div>
                </div>
            )}

            {/* BATCH MODAL */}
            {showBatchModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white/5 dark:bg-brand-darkCard border border-white/10 dark:border-brand-darkBorder rounded-[2rem] p-8 w-full max-w-4xl shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] backdrop-blur-3xl">
                        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                            <h3 className="text-2xl font-extrabold text-white flex items-center gap-3 drop-shadow-sm"><Layers className="text-blue-400"/> {editMode ? 'Edit Batch' : 'New Batch'}</h3>
                            <button onClick={() => setShowBatchModal(false)} className="text-gray-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/10 transition-colors hover:bg-red-500/20 hover:border-red-500/30 outline-none"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleBatchSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Batch Name *</label><input type="text" name="name" defaultValue={editData?.name} required className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/40 shadow-inner transition-all" /></div>
                                <div><label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Logo Image (Optional)</label>
                                <input type="file" name="logo" className="w-full bg-black/20 border border-white/10 rounded-xl p-2.5 text-sm text-gray-400 file:bg-white/10 file:text-white file:border-0 file:rounded-lg file:px-4 file:py-2 file:mr-4 cursor-pointer shadow-inner transition-all" onChange={(e) => setSelectedLogoName(e.target.files[0]?.name || "")} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Batch Type *</label>
                                    <select name="type" defaultValue={editData?.type || "1"} required className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent shadow-inner cursor-pointer appearance-none transition-all">
                                        <option value="1" className="bg-slate-800 text-white">Theory only</option><option value="2" className="bg-slate-800 text-white">Paper only</option><option value="3" className="bg-slate-800 text-white">Theory and Paper</option><option value="4" className="bg-slate-800 text-white">Others</option>
                                    </select>
                                </div>
                                <div><label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Display Order</label><input type="number" name="itemOrder" defaultValue={editData?.itemOrder || "1"} className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/40 shadow-inner transition-all" /></div>
                                <div className="md:col-span-2"><label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Description</label><textarea name="description" defaultValue={editData?.description} rows="3" className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/40 resize-none shadow-inner transition-all"></textarea></div>
                            </div>
                            <button type="submit" className="w-full bg-brand-accent/90 hover:bg-brand-accent text-white font-extrabold py-4 text-lg rounded-2xl shadow-[0_4px_15px_rgba(225,29,72,0.4)] mt-6 outline-none transition-transform hover:scale-[1.01] uppercase tracking-wider border border-transparent">{editMode ? 'Update Batch' : 'Create Batch'}</button>
                        </form>
                    </div>
                </div>
            )}

            {/* PAYMENT GROUP MODAL */}
            {showGroupModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white/5 dark:bg-brand-darkCard border border-white/10 dark:border-brand-darkBorder rounded-[2rem] p-6 md:p-8 w-full max-w-5xl shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col backdrop-blur-3xl">
                        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4 shrink-0">
                            <h3 className="text-2xl font-extrabold text-white flex items-center gap-3 drop-shadow-sm"><Layers className="text-blue-400"/> {editMode ? 'Edit Payment Group' : 'New Payment Group'}</h3>
                            <button onClick={() => setShowGroupModal(false)} className="text-gray-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/10 transition-colors hover:bg-red-500/20 hover:border-red-500/30 outline-none"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleGroupSubmit} className="space-y-8 flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Group Name *</label><input type="text" name="name" defaultValue={editData?.name} placeholder="e.g. 2026 Monthly Jan" required className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/40 shadow-inner transition-all" /></div>
                                <div><label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Order Number</label><input type="number" name="itemOrder" defaultValue={editData?.itemOrder || "1"} className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/40 shadow-inner transition-all" /></div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Payment Type *</label>
                                    <select name="paymentType" defaultValue={editData?.type === 1 ? "Monthly" : "Full Payment"} required onChange={(e) => { document.getElementById('discountRulesSection').style.display = e.target.value === 'Full Payment' ? 'block' : 'none'; }} className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent cursor-pointer shadow-inner appearance-none transition-all">
                                        <option value="Monthly" className="bg-slate-800 text-white">Monthly Payment</option><option value="Full Payment" className="bg-slate-800 text-white">Full Payment</option>
                                    </select>
                                </div>
                            </div>

                            <div id="discountRulesSection" style={{display: (editData?.type === 2 || (!editMode && discountRules.length > 0)) ? 'block' : 'none'}} className="bg-blue-500/10 border border-blue-500/20 p-6 md:p-8 rounded-[2rem] shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <div><h4 className="text-lg font-extrabold text-blue-400 uppercase tracking-widest drop-shadow-sm">Bundle Discount Rules</h4></div>
                                    <button type="button" onClick={addDiscountRule} className="bg-blue-600/90 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 outline-none shadow-sm border border-transparent"><Plus size={18}/> Add Rule</button>
                                </div>
                                <div className="space-y-4">
                                    {discountRules.map((rule, idx) => (
                                        <div key={idx} className="flex flex-col sm:flex-row gap-4 items-end bg-black/20 p-5 rounded-2xl border border-white/10 shadow-inner">
                                            <div className="flex-1 w-full"><label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Subject Count:</label><input type="number" value={rule.courseCount} onChange={(e) => handleDiscountRuleChange(idx, 'courseCount', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-500 shadow-inner transition-all" /></div>
                                            <div className="flex-1 w-full"><label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Price/Subject:</label><input type="number" value={rule.pricePerCourse} onChange={(e) => handleDiscountRuleChange(idx, 'pricePerCourse', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-500 shadow-inner transition-all" /></div>
                                            <button type="button" onClick={() => removeDiscountRule(idx)} className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white p-3.5 rounded-xl transition-colors w-full sm:w-auto flex justify-center outline-none shadow-sm"><Trash2 size={20}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-4 mt-6 shrink-0">
                                <button type="submit" className="w-full bg-brand-accent/90 hover:bg-brand-accent text-white font-extrabold py-4 text-lg rounded-2xl shadow-[0_4px_15px_rgba(225,29,72,0.4)] outline-none transition-transform hover:scale-[1.01] uppercase tracking-wide border border-transparent">{editMode ? 'Update Group' : 'Create Group'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* SETUP INSTALLMENTS MODAL */}
            {showInstallmentModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white/5 dark:bg-brand-darkCard border border-white/10 dark:border-brand-darkBorder rounded-[2rem] p-6 md:p-8 w-full max-w-5xl shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col backdrop-blur-3xl">
                        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4 shrink-0"><h3 className="text-2xl font-extrabold text-white flex items-center gap-3 drop-shadow-sm"><CreditCard className="text-orange-400"/> Setup Installments</h3><button onClick={() => setShowInstallmentModal(false)} className="text-gray-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/10 transition-colors hover:bg-red-500/20 hover:border-red-500/30 outline-none"><X size={20}/></button></div>
                        
                        {existingInstallments.length > 0 && (
                            <div className="mb-8 bg-white/5 border border-white/10 rounded-[2rem] p-6 shadow-sm">
                                <h4 className="text-sm font-extrabold text-orange-400 mb-4 uppercase tracking-widest drop-shadow-sm">Existing Installment Plans</h4>
                                <div className="space-y-4">
                                    {existingInstallments.map(plan => (
                                        <div key={plan.id} className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-black/40 p-5 rounded-2xl border border-white/5 shadow-inner hover:border-white/20 transition-all">
                                            <div>
                                                <span className="font-extrabold text-white text-lg drop-shadow-sm">Trigger: {plan.subjectCount} Subjects</span>
                                                <span className="text-sm font-bold text-gray-400 ml-3">({JSON.parse(plan.details).length} Steps)</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button type="button" onClick={() => handleEditInstallment(plan)} className="text-blue-400 bg-blue-500/10 border border-transparent hover:bg-blue-500/30 hover:border-blue-500/50 p-2.5 rounded-xl transition-all outline-none"><Edit3 size={18}/></button>
                                                <button type="button" onClick={() => handleDeleteInstallment(plan.id)} className="text-red-400 bg-red-500/10 border border-transparent hover:bg-red-500/30 hover:border-red-500/50 p-2.5 rounded-xl transition-all outline-none"><Trash2 size={18}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleInstallmentSubmit} className="space-y-8 flex-1">
                            <div className="bg-black/20 p-6 md:p-8 rounded-[2rem] border border-white/5 shadow-inner">
                                <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Trigger Subject Count * (e.g. 3)</label>
                                <input type="number" name="subjectCount" value={installmentSubjectCount} onChange={(e) => setInstallmentSubjectCount(e.target.value)} placeholder="Number of subjects needed to trigger installment" required className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-orange-500 shadow-inner transition-all" />
                            </div>
                            
                            <div className="bg-orange-500/10 p-6 md:p-8 rounded-[2rem] border border-orange-500/20 shadow-sm">
                                <div className="flex justify-between items-center mb-8">
                                    <h4 className="text-lg font-extrabold text-orange-400 uppercase tracking-widest drop-shadow-sm">Installment Steps</h4>
                                    <button type="button" onClick={addInstallmentStep} className="bg-orange-600/90 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm outline-none border border-transparent"><Plus size={18}/> Add Step</button>
                                </div>
                                <div className="space-y-4">
                                    {installmentSteps.map((step, idx) => (
                                        <div key={idx} className="flex flex-col sm:flex-row gap-5 items-center bg-black/40 p-5 rounded-2xl border border-white/10 shadow-inner">
                                            <div className="font-extrabold text-slate-400 w-full sm:w-16 uppercase tracking-wider text-xs">Step {step.step}:</div>
                                            <div className="flex-1 w-full">
                                                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Amount (Rs) *</label>
                                                <input type="number" required value={step.amount} onChange={(e) => { const newSteps=[...installmentSteps]; newSteps[idx].amount=e.target.value; setInstallmentSteps(newSteps); }} className="w-full bg-slate-900/60 border border-white/10 rounded-xl p-3.5 text-sm text-white outline-none focus:border-orange-500 shadow-inner transition-all" />
                                            </div>
                                            <div className="w-full sm:w-40">
                                                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider" title="Gap from previous payment">Gap (Days) *</label>
                                                <input type="number" required value={step.gapDays} onChange={(e) => { const newSteps=[...installmentSteps]; newSteps[idx].gapDays=e.target.value; setInstallmentSteps(newSteps); }} className="w-full bg-slate-900/60 border border-white/10 rounded-xl p-3.5 text-sm text-white outline-none focus:border-orange-500 shadow-inner transition-all" />
                                            </div>
                                            {installmentSteps.length > 1 && (
                                                <button type="button" onClick={() => removeInstallmentStep(idx)} className="mt-0 sm:mt-6 w-full sm:w-auto text-red-400 bg-red-500/10 border border-transparent hover:bg-red-500/30 hover:border-red-500/50 p-3.5 rounded-xl transition-all flex justify-center outline-none"><Trash2 size={20}/></button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-orange-600/90 hover:bg-orange-600 text-white font-extrabold py-4 text-lg rounded-2xl shadow-[0_4px_15px_rgba(234,88,12,0.4)] mt-6 outline-none transition-transform hover:scale-[1.01] uppercase tracking-wide border border-transparent">
                                {editInstallmentId ? 'Update Installment Plan' : 'Save Installment Plan'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* SUBJECT MODAL */}
            {showCourseModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white/5 dark:bg-brand-darkCard border border-white/10 dark:border-brand-darkBorder rounded-[2rem] p-6 md:p-8 w-full max-w-7xl shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] max-h-[95vh] overflow-y-auto custom-scrollbar flex flex-col backdrop-blur-3xl">
                        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4 shrink-0"><h3 className="text-2xl font-extrabold text-white drop-shadow-sm">{editMode ? 'Edit Subject' : 'New Subject'}</h3><button onClick={() => setShowCourseModal(false)} className="text-gray-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/10 transition-colors hover:bg-red-500/20 hover:border-red-500/30 outline-none"><X size={20}/></button></div>
                        <form onSubmit={handleCourseSubmit} className="space-y-8 flex-1">
                            <div className="flex flex-col xl:flex-row gap-10">
                                <div className="w-full xl:w-[45%] space-y-6">
                                    {(activeBusiness?.category === 'Advance Level' || activeBusiness?.category === 'AL') && (
                                        <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-[2rem] shadow-sm">
                                            <label className="text-xs font-bold text-blue-300 mb-4 block uppercase tracking-widest drop-shadow-sm">Select A/L Streams (Can select multiple) *</label>
                                            <div className="flex flex-wrap gap-4">
                                                {getBatchStreams().map(s => (
                                                    <label key={s} className="flex items-center gap-2 cursor-pointer text-white font-bold bg-black/20 p-3.5 rounded-xl border border-white/10 hover:bg-white/10 shadow-inner transition-colors">
                                                        <input type="checkbox" name="streams" value={s} defaultChecked={editData?.streams?.includes(s) || editData?.stream === s} className="w-4 h-4 accent-blue-500 transition-transform"/> {s}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 gap-6">
                                        <div><label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Subject Name *</label><input type="text" name="name" defaultValue={editData?.name} required className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/40 shadow-inner transition-all" /></div>
                                        <div><label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Subject Code (Optional)</label><input type="text" name="code" defaultValue={editData?.code} className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/40 shadow-inner transition-all" /></div>
                                        <div><label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Description</label><textarea name="description" defaultValue={editData?.description} rows="4" className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/40 resize-none shadow-inner transition-all"></textarea></div>
                                    </div>
                                    <div className="mt-4">
                                        <label className="flex items-start gap-4 cursor-pointer group bg-orange-500/10 p-5 rounded-2xl border border-orange-500/20 hover:bg-orange-500/20 transition-all shadow-sm">
                                            <input type="checkbox" name="isDiscountExcluded" value="true" defaultChecked={editData?.isDiscountExcluded} className="w-6 h-6 accent-orange-500 mt-0.5 shrink-0 transition-transform" />
                                            <div>
                                                <span className="text-sm font-extrabold text-orange-400 group-hover:text-orange-300 transition-colors drop-shadow-sm">Exclude from Bundle Discounts</span>
                                                <p className="text-[11px] text-orange-200/60 mt-1.5 font-bold leading-relaxed">If ticked, this subject will NOT be counted for bundle discounts when students enroll.</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className="w-full xl:w-[55%] space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/20 p-6 rounded-[2rem] border border-white/5 shadow-inner">
                                        <div>
                                            <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Lecturer Name (Optional)</label>
                                            <input type="text" list="lecturersList" name="lecturerName" defaultValue={editData?.lecturerName} placeholder="Select or type name..." className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent shadow-inner transition-all" />
                                            <datalist id="lecturersList">
                                                {activeBatch?.lecturers && JSON.parse(activeBatch.lecturers).map((m, i) => (
                                                    <option key={i} value={m.name} />
                                                ))}
                                            </datalist>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Lecturer Image (Optional)</label>
                                            {editMode && editData?.groupPrices && (() => {
                                                try {
                                                    const parsed = typeof editData.groupPrices === 'string' ? JSON.parse(editData.groupPrices) : editData.groupPrices;
                                                    if (parsed?.[0]?.lecturerImage) {
                                                        return <p className="text-[10px] text-green-400 font-bold mb-2 border border-green-500/20 bg-green-500/10 px-3 py-1.5 rounded-lg inline-block drop-shadow-sm">Current: {parsed[0].lecturerImage}</p>;
                                                    }
                                                } catch(e) {}
                                                return null;
                                            })()}
                                            <input type="file" name="lecturerImage" accept="image/*" className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-gray-400 file:bg-white/10 file:text-white file:border-0 file:rounded-lg file:px-4 file:py-2 file:mr-4 cursor-pointer shadow-inner transition-all" />
                                        </div>
                                    </div>

                                    <div className="bg-white/5 p-6 md:p-8 rounded-[2rem] border border-white/10 shadow-sm">
                                        <h4 className="text-lg font-extrabold text-slate-200 mb-6 uppercase tracking-wider drop-shadow-sm">Assign to Groups & Pricing *</h4>
                                        <div className="space-y-6">
                                            {activeBatch?.groups?.length === 0 ? <p className="text-red-400 text-sm font-bold bg-red-500/10 p-4 rounded-xl border border-red-500/20 shadow-sm drop-shadow-sm">Create Groups first!</p> : 
                                            activeBatch?.groups?.map(g => (
                                                <div key={g.id} className={`flex flex-col p-6 rounded-[2rem] border transition-all shadow-sm ${selectedGroupPrices[g.id] !== undefined ? 'bg-blue-500/10 border-blue-500/40' : 'bg-black/20 border-white/5 hover:border-white/20'}`}>
                                                    <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5 w-full">
                                                        <label className="flex items-center gap-4 cursor-pointer min-w-[200px] group">
                                                            <input type="checkbox" checked={selectedGroupPrices[g.id] !== undefined} onChange={() => toggleGroupPrice(g.id)} className="hidden" />
                                                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${selectedGroupPrices[g.id] !== undefined ? 'bg-blue-500 border-blue-500' : 'border-slate-500 group-hover:border-slate-400'}`}>{selectedGroupPrices[g.id] !== undefined && <CheckCircle size={14} className="text-white"/>}</div>
                                                            <span className="text-base font-extrabold text-slate-300 group-hover:text-white transition-colors drop-shadow-sm">{g.name}</span>
                                                        </label>
                                                        
                                                        {selectedGroupPrices[g.id] !== undefined && (
                                                            <div className="flex-1 w-full flex flex-col sm:flex-row items-center gap-4 animate-in fade-in duration-200">
                                                                <input type="number" required placeholder={`Price (LKR)`} value={selectedGroupPrices[g.id].price} onChange={(e) => updateGroupData(g.id, 'price', e.target.value)} className="w-full sm:w-1/2 bg-slate-900 border border-blue-500/50 rounded-xl p-3.5 text-sm text-white font-bold outline-none focus:border-blue-400 shadow-inner transition-all" />
                                                                
                                                                <label className="flex items-center justify-center gap-3 cursor-pointer bg-orange-500/10 border border-orange-500/30 px-5 py-3.5 rounded-xl hover:bg-orange-500/20 transition-colors w-full sm:w-1/2 h-full shadow-sm">
                                                                    <input type="checkbox" checked={selectedGroupPrices[g.id].deliverTute} onChange={(e) => updateGroupData(g.id, 'deliverTute', e.target.checked)} className="accent-orange-500 w-5 h-5 transition-transform" />
                                                                    <span className="text-[11px] font-extrabold text-orange-400 uppercase tracking-widest whitespace-nowrap drop-shadow-sm">Deliver Tute</span>
                                                                </label>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {selectedGroupPrices[g.id] !== undefined && selectedGroupPrices[g.id].deliverTute && (
                                                        <div className="mt-6 pt-6 border-t border-blue-500/20 grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-top-2">
                                                            <div>
                                                                <label className="text-[10px] text-slate-400 mb-1.5 block uppercase tracking-widest font-extrabold">Tute Name (Optional)</label>
                                                                <input type="text" placeholder="e.g. Mechanics Part 1" value={selectedGroupPrices[g.id].tuteName} onChange={(e) => updateGroupData(g.id, 'tuteName', e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-orange-500 shadow-inner transition-all" />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] text-slate-400 mb-1.5 block uppercase tracking-widest font-extrabold">Tute Cover (Optional)</label>
                                                                {selectedGroupPrices[g.id]?.tuteCover && (
                                                                    <p className="text-[10px] font-bold text-green-400 mb-1.5 bg-green-500/10 px-2 py-1 rounded inline-block border border-green-500/20 drop-shadow-sm">Current: {selectedGroupPrices[g.id].tuteCover}</p>
                                                                )}
                                                                <input type="file" accept="image/*" onChange={(e) => updateGroupData(g.id, 'tuteFile', e.target.files[0])} className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-sm text-gray-400 file:bg-white/10 file:text-white file:border-0 file:rounded-lg file:px-3 file:py-1.5 file:mr-3 cursor-pointer shadow-inner transition-all" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-8 border-t border-white/10 mt-8 shrink-0">
                                <button type="submit" className="w-full bg-brand-accent/90 hover:bg-brand-accent text-white font-extrabold py-4 text-lg rounded-2xl shadow-[0_4px_15px_rgba(225,29,72,0.4)] transition-transform hover:scale-[1.01] uppercase tracking-wide outline-none border border-transparent">
                                    {editMode ? 'Update Subject' : 'Save Subject'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ADD/EDIT FOLDER MODAL */}
            {showLessonGroupModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white/5 dark:bg-brand-darkCard border border-white/10 dark:border-brand-darkBorder rounded-[2rem] p-8 w-full max-w-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] flex flex-col backdrop-blur-3xl">
                        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                            <h3 className="text-2xl font-extrabold text-white drop-shadow-sm">{editMode ? 'Edit Folder' : 'New Folder'}</h3>
                            <button onClick={() => setShowLessonGroupModal(false)} className="text-gray-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/10 transition-colors hover:bg-red-500/20 hover:border-red-500/30 outline-none"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleLessonGroupSubmit} className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Folder Title *</label>
                                <input type="text" name="title" defaultValue={editData?.title || editData?.name} required className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/40 shadow-inner transition-all" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Display Order</label>
                                <input type="number" name="order" defaultValue={editData?.itemOrder || "1"} className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/40 shadow-inner transition-all" />
                            </div>
                            <button type="submit" className="w-full bg-brand-accent/90 hover:bg-brand-accent text-white font-extrabold py-4 text-lg rounded-2xl shadow-[0_4px_15px_rgba(225,29,72,0.4)] mt-6 outline-none transition-transform hover:scale-[1.01] uppercase tracking-wide border border-transparent">
                                {editMode ? 'Update Folder' : 'Create Folder'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* LECTURER MODAL */}
            {showLecturerModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white/5 dark:bg-brand-darkCard border border-white/10 dark:border-brand-darkBorder rounded-[2rem] p-8 w-full max-w-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] flex flex-col backdrop-blur-3xl">
                        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                            <h3 className="text-2xl font-extrabold text-white drop-shadow-sm">{editMode ? 'Edit Lecturer' : 'New Lecturer'}</h3>
                            <button type="button" onClick={() => setShowLecturerModal(false)} className="text-gray-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/10 transition-colors hover:bg-red-500/20 hover:border-red-500/30 outline-none"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleLecturerSubmit} className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Lecturer Name *</label>
                                <input type="text" name="name" defaultValue={editData?.name} required placeholder="e.g. Dr. Kamal" className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/40 shadow-inner transition-all" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">Phone Number (Optional)</label>
                                <input type="text" name="phone" defaultValue={editData?.phone} placeholder="e.g. 0712345678" className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/40 shadow-inner transition-all" />
                            </div>
                            <button type="submit" className="w-full bg-brand-accent/90 hover:bg-brand-accent text-white font-extrabold py-4 text-lg rounded-2xl shadow-[0_4px_15px_rgba(225,29,72,0.4)] mt-6 outline-none transition-transform hover:scale-[1.01] uppercase tracking-wide border border-transparent">
                                {editMode ? 'Update Lecturer' : 'Add Lecturer'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* PREVIEW MODAL - Glassmorphism */}
            {previewData && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white/5 dark:bg-brand-darkCard border border-white/10 dark:border-brand-darkBorder rounded-[2rem] w-full max-w-7xl h-[85vh] flex flex-col shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] overflow-hidden backdrop-blur-3xl">
                        <div className="p-6 md:p-8 border-b border-white/10 flex justify-between items-center bg-black/20 dark:bg-white/5">
                            <h3 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-3 drop-shadow-sm"><MonitorPlay size={28} className="text-blue-400"/> {previewData.title}</h3>
                            <div className="flex gap-3">
                                <a href={previewData.fileName ? `${getBaseUrl()}/storage/documents/${previewData.fileName}` : previewData.link} target="_blank" rel="noreferrer" className="bg-brand-accent/90 hover:bg-brand-accent text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-[0_4px_15px_rgba(225,29,72,0.4)] outline-none border border-transparent">
                                    <ExternalLink size={18}/> Open External
                                </a>
                                <button onClick={() => setPreviewData(null)} className="text-gray-400 hover:text-white bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 p-2.5 rounded-xl transition-all shadow-sm outline-none"><X size={20}/></button>
                            </div>
                        </div>
                        <div className="flex-1 bg-black/40 p-6 relative flex items-center justify-center shadow-inner">
                            {previewData.fileName ? (
                                <iframe src={`${getBaseUrl()}/storage/documents/${previewData.fileName}`} className="w-full h-full rounded-2xl bg-white shadow-inner border border-white/10" title="Document Preview" />
                            ) : previewData.link ? (
                                <iframe src={getEmbedUrl(previewData.link)} className="w-full h-full rounded-2xl bg-black border border-white/10 shadow-inner" title="Video/Live Preview" allowFullScreen />
                            ) : (
                                <div className="text-center text-slate-500"><Ban size={64} className="mx-auto mb-4 opacity-40"/><p className="text-xl font-bold">No preview available.</p></div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}