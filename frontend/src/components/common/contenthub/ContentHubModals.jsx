import React from 'react';
import { X, Send, UploadCloud, Users, CheckCircle, Plus, Edit3, Trash2, CreditCard, MessageSquare, MonitorPlay, ExternalLink, Ban, BookOpen, Building2 } from 'lucide-react';
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

    return (
        <>
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

            {showBusinessModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-800/90 border border-white/10 rounded-[2rem] p-8 w-full max-w-5xl shadow-2xl backdrop-blur-2xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4 shrink-0">
                            <h3 className="text-2xl font-bold text-white flex items-center gap-3"><Building2 className="text-blue-400"/> {editMode ? 'Edit Business Configuration' : 'Setup New Business'}</h3>
                            <button onClick={() => setShowBusinessModal(false)} className="text-slate-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/5 transition-all hover:bg-red-500"><X size={20}/></button>
                        </div>
                        
                        <form onSubmit={handleBusinessSubmit} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                            <div className="flex flex-col lg:flex-row gap-8">
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
                                
                                {/* 🔥 LECTURER NAME FIELD WITH DROPDOWN SUGGESTIONS 🔥 */}
                                <div>
                                    <label className="text-sm font-semibold text-slate-300 mb-2 block">Lecturer Name (Optional)</label>
                                    <input type="text" list="lecturersList" name="lecturerName" defaultValue={editData?.lecturerName} placeholder="Select or type name..." className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500" />
                                    <datalist id="lecturersList">
                                        {activeBatch?.lecturers && JSON.parse(activeBatch.lecturers).map((m, i) => (
                                            <option key={i} value={m.name} />
                                        ))}
                                    </datalist>
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

            {/* 🔥 NEW LECTURER MODAL 🔥 */}
            {showLecturerModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-800/90 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl backdrop-blur-2xl">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-bold text-white">{editMode ? 'Edit Lecturer' : 'New Lecturer'}</h3>
                            <button type="button" onClick={() => setShowLecturerModal(false)} className="text-slate-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/5"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleLecturerSubmit} className="space-y-6">
                            <div>
                                <label className="text-sm font-semibold text-slate-300 mb-2 block">Lecturer Name *</label>
                                <input type="text" name="name" defaultValue={editData?.name} required placeholder="e.g. Dr. Kamal" className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-slate-300 mb-2 block">Phone Number (Optional)</label>
                                <input type="text" name="phone" defaultValue={editData?.phone} placeholder="e.g. 0712345678" className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500" />
                            </div>
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 text-lg rounded-2xl shadow-lg mt-4">
                                {editMode ? 'Update Lecturer' : 'Add Lecturer'}
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
        </>
    );
}