import React from 'react';
import { FolderOpen, Layers, BookOpen, Edit3, Trash2, ChevronRight, ChevronDown, GripVertical, CheckCircle, Video, MonitorPlay, FileText, FileSignature, Power, UserPlus, Plus, Users } from 'lucide-react';

export default function ContentHubViews({ state, actions }) {
    const {
        isSystemAdmin, canManageBatches, canManageGroupsAndSubjects, canManageContent,
        viewLevel, activeBusiness, activeBatch, batchTab, activeSubject, contentTab, businesses, batches, 
        lessonGroups, subjectContents, editMode, openFolders, groupedSubjects
    } = state;

    const {
        openBusinessDetails, openBatchDetails, openContentsView, getImageUrl, getManagerName, toggleBusinessStatus, toggleBatchStatus, deleteItem,
        setEditData, setEditMode, setSelectedLogoName, setShowBusinessModal, setShowAssignModal, setShowBatchModal, setShowGroupModal, setShowCourseModal,
        setShowLessonGroupModal, setShowContentModal, setPreviewData, setContentType, setPrefilledFolder, setSelectedBatchesForContent,
        toggleFolder, setBatchTab, setContentTab, isMatchedType, getFolderId, setDiscountRules, setSelectedGroupPrices
    } = actions;

    return (
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
                        <button onClick={() => setBatchTab('lecturers')} className={`px-6 py-3 rounded-xl font-bold text-base flex items-center gap-2 transition-all whitespace-nowrap ${batchTab === 'lecturers' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><Users size={20}/> Lecturers</button>
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

                        {batchTab === 'lecturers' && (
                            (!activeBatch?.lecturers || JSON.parse(activeBatch.lecturers).length === 0) ? <p className="text-center text-slate-400 py-16 bg-slate-800/30 rounded-3xl border border-white/10 backdrop-blur-xl text-lg">No lecturers added for this batch.</p> : 
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {JSON.parse(activeBatch.lecturers).map((lecturer, idx) => (
                                    <div key={idx} className="bg-slate-800/40 border border-white/10 p-6 rounded-3xl flex flex-col justify-between gap-4 transition-all backdrop-blur-xl shadow-lg">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold text-xl border border-blue-500/30 shrink-0">
                                                {lecturer.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="overflow-hidden">
                                                <h3 className="text-lg font-bold text-white truncate" title={lecturer.name}>{lecturer.name}</h3>
                                                <p className="text-sm text-slate-400">{lecturer.phone || 'No Phone'}</p>
                                            </div>
                                        </div>
                                        {canManageGroupsAndSubjects && (
                                            <div className="flex gap-2 justify-end mt-2 pt-4 border-t border-white/10">
                                                <button onClick={() => { setEditData({ ...lecturer, index: idx }); setEditMode(true); actions.setShowLecturerModal(true); }} className="text-blue-400 bg-white/5 hover:bg-blue-500 hover:text-white p-2.5 rounded-xl transition-colors"><Edit3 size={18}/></button>
                                                <button onClick={() => actions.handleDeleteLecturer(idx)} className="text-red-400 bg-white/5 hover:bg-red-500 hover:text-white p-2.5 rounded-xl transition-colors"><Trash2 size={18}/></button>
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
    );
}