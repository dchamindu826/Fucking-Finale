import React, { useState, useEffect } from 'react';
import axios from '../../../api/axios';
import { UploadCloud, CreditCard, ChevronRight, Wallet, ArrowLeft, CheckCircle, Tag, CalendarClock, X, Info, Camera, MonitorPlay, Ban, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';

// 🔥 Images Import (Check path if needed) 🔥
import correctCdmImg from '../../../assets/correct-cdm.jpg';
import wrongCdmImg from '../../../assets/wrong-cdm.jpg';
import correctReceiptImg from '../../../assets/correct-receipt.jpg';
import wrongReceiptImg from '../../../assets/wrong-receipt.jpg';

const EnrollmentTab = ({ businesses, setActiveTab }) => {
  const [selectionLevel, setSelectionLevel] = useState(0);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [paymentPlan, setPaymentPlan] = useState(null); 

  const [activeStream, setActiveStream] = useState('All');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [enrolledSubjects, setEnrolledSubjects] = useState([]); 
  
  const [showInstallmentPrompt, setShowInstallmentPrompt] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSlipInstructions, setShowSlipInstructions] = useState(false); 

  const [finalPaymentType, setFinalPaymentType] = useState(null); 
  const [availableInstallmentPlan, setAvailableInstallmentPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('slip'); 
  const [slipFiles, setSlipFiles] = useState([]); 
  const [remark, setRemark] = useState(''); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  const backendBaseUrl = axios.defaults.baseURL ? axios.defaults.baseURL.replace('/api', '') : 'https://imacampus.online';

  const getImageUrl = (imageName) => (!imageName || imageName === 'default.png' || imageName === 'null') 
      ? '/logo.png' 
      : `${backendBaseUrl}/storage/icons/${imageName}`;

  useEffect(() => {
      axios.get('/student/my-enrolled-subjects')
           .then(res => setEnrolledSubjects(res.data))
           .catch(e => console.error("Error fetching enrolled subjects"));
  }, []);

  const parseStreams = (streamString) => streamString ? streamString.split(',').map(s => s.trim()).filter(s => s) : [];
  
  const getFilteredBatches = () => selectedBusiness?.batches || [];
  
  const getFilteredGroups = () => {
    if (!selectedBatch) return [];
    if (paymentPlan === 'monthly') return selectedBatch.groups.filter(g => g.type === 1).sort((a, b) => a.itemOrder - b.itemOrder);
    if (paymentPlan === 'full') return selectedBatch.groups.filter(g => g.type !== 1).sort((a, b) => a.itemOrder - b.itemOrder);
    return [];
  };

  const getFilteredCourses = () => {
    if (!selectedGroup || !selectedGroup.courses) return [];
    let courses = selectedGroup.courses;
    if (activeStream !== 'All') {
        courses = courses.filter(c => {
            let parsedStreams = [];
            try {
                if (c.streams && typeof c.streams === 'string') parsedStreams = JSON.parse(c.streams);
                else if (Array.isArray(c.streams)) parsedStreams = c.streams;
            } catch(e) {}
            if (parsedStreams && parsedStreams.length > 0 && parsedStreams.includes(activeStream)) return true;
            if (c.stream && c.stream.includes(activeStream)) return true;
            return false;
        });
    }
    return courses;
  };

  const getActiveDiscount = () => {
      if (!selectedGroup || !selectedGroup.discount_rules) return null;
      try {
          const rules = JSON.parse(selectedGroup.discount_rules);
          rules.sort((a, b) => b.courseCount - a.courseCount);
          const eligibleSubjectsCount = getFilteredCourses().filter(c => selectedSubjects.includes(c.id) && !c.isDiscountExcluded).length;

          for (let rule of rules) {
              if (eligibleSubjectsCount >= rule.courseCount) return { triggerCount: rule.courseCount, newPricePerCourse: rule.pricePerCourse };
          }
      } catch (e) {}
      return null;
  };

  const calculateTotal = () => {
    const courses = getFilteredCourses();
    if (!selectedGroup || !courses || selectedSubjects.length === 0) return 0;
    
    const activeDiscount = getActiveDiscount();
    let total = 0;

    courses.filter(c => selectedSubjects.includes(c.id)).forEach(course => {
        if (activeDiscount && !course.isDiscountExcluded) {
            total += activeDiscount.newPricePerCourse;
        } else {
            total += Number(course.price || 0);
        }
    });
    return total;
  };

  const getOriginalTotal = () => getFilteredCourses().filter(c => selectedSubjects.includes(c.id)).reduce((sum, course) => sum + Number(course.price || 0), 0);

  const checkInstallmentEligibility = () => {
      if (paymentPlan !== 'full' || !selectedBatch.installment_plans_parsed) return null;
      const plans = selectedBatch.installment_plans_parsed;
      if(!plans || plans.length === 0) return null;
      let sortedPlans = [...plans].sort((a, b) => b.subjectCount - a.subjectCount);
      for (let plan of sortedPlans) {
          if (selectedSubjects.length >= plan.subjectCount) return plan;
      }
      return null;
  };

  const handleProceedToPay = () => {
      if (selectedSubjects.length === 0) return toast.error("Please select subjects first.");
      const eligiblePlan = checkInstallmentEligibility();
      if (eligiblePlan) {
          setAvailableInstallmentPlan(eligiblePlan);
          setShowInstallmentPrompt(true); 
      } else {
          setFinalPaymentType('pay_full');
          setShowPaymentModal(true); 
      }
  };

  const handleFileChange = (e) => {
      const newFiles = Array.from(e.target.files);
      const totalFiles = [...slipFiles, ...newFiles];
      
      if (totalFiles.length > 4) {
          toast.error("You can only upload up to 4 slips.");
          setSlipFiles(totalFiles.slice(0, 4));
      } else {
          setSlipFiles(totalFiles);
      }
  };

  const removeFile = (indexToRemove) => {
      setSlipFiles(slipFiles.filter((_, index) => index !== indexToRemove));
  };

  const openSlipInstructions = () => setShowSlipInstructions(true);

  const confirmSlipInstructions = () => {
      // 1. Instantly trigger the file upload dialog (browser security requires this to be immediate)
      const fileInput = document.getElementById('slip-upload');
      if (fileInput) {
          fileInput.click();
      }
      
      // 2. Hide the instruction modal completely without any delay
      setShowSlipInstructions(false); 
  };

  const handleFinalSubmit = async () => {
    if (paymentMethod === 'slip' && slipFiles.length === 0) return toast.error("Please upload your bank slip(s).");
    
    try {
      setIsSubmitting(true);
      const amountToPay = finalPaymentType === 'installment' ? JSON.parse(availableInstallmentPlan.details)[0].amount : calculateTotal();
      const orderId = `ORD-${Date.now()}`;

      if (paymentMethod === 'payhere') {
          console.log("Generating Hash for PayHere...");
          const hashRes = await axios.post('/student/payhere-hash', { 
              amount: amountToPay, 
              orderId: orderId,
              currency: "LKR"
          });
          console.log("Hash response received:", hashRes.data);

         const payment = {
              sandbox: true, // Make sure this is true for testing!
              // Add your actual ID as a fallback just in case the .env fails to load
              merchant_id: import.meta.env.VITE_PAYHERE_MERCHANT_ID || "222646", 
              return_url: window.location.origin + "/student/dashboard", 
              cancel_url: window.location.origin + "/student/dashboard",
              notify_url: `${backendBaseUrl}/api/student/payhere-notify`, 
              order_id: orderId,
              items: "Course Enrollment",
              amount: amountToPay,
              currency: "LKR",
              hash: hashRes.data.hash || "", // Add fallback here too to prevent crashes
              first_name: "Student", 
              last_name: "Name",
              email: "student@imacampus.lk",
              phone: "0770000000",
              address: "Sri Lanka",
              city: "Colombo",
              country: "Sri Lanka"
          };
          
          console.log("Starting PayHere with payload:", payment);

          window.payhere.onCompleted = async function onCompleted(orderId) {
              console.log("PayHere Success, OrderId:", orderId);
              toast.success("Payment successful! Processing enrollment...");
              await saveEnrollmentToBackend("payhere", orderId);
          };

          window.payhere.onDismissed = function onDismissed() {
              console.log("PayHere Dismissed by user.");
              toast.error("Payment dismissed.");
              setIsSubmitting(false);
          };

          window.payhere.onError = function onError(error) {
              console.error("🔥 PAYHERE ERROR CAUGHT 🔥: ", error);
              toast.error("Payment Error. Check console for details.");
              setIsSubmitting(false);
          };

          window.payhere.startPayment(payment);

      } else {
          await saveEnrollmentToBackend("slip", null);
      }
    } catch (error) {
      console.error("Final Submit Error:", error);
      toast.error(error.response?.data?.error || "Error processing request.");
      setIsSubmitting(false);
    }
  };

  const saveEnrollmentToBackend = async (method, payhereOrderId) => {
    const amountToPay = finalPaymentType === 'installment' 
                        ? JSON.parse(availableInstallmentPlan.details)[0]?.amount 
                        : calculateTotal();

    const formData = new FormData();
    formData.append('businessId', selectedBusiness.id);
    formData.append('batchId', selectedBatch.id);
    formData.append('groupId', selectedGroup.id);
    formData.append('subjects', JSON.stringify(selectedSubjects));
    formData.append('paymentMethodChosen', finalPaymentType); 
    formData.append('method', method);
    formData.append('amount', amountToPay); 
    if (remark) formData.append('remark', remark);

    if (payhereOrderId) formData.append('orderId', payhereOrderId);
    if (method === 'slip') {
        slipFiles.forEach(file => {
            formData.append('slipImages', file);
        });
    }

    try {
        const response = await axios.post('/student/enroll-with-slip', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
        if(response.status === 200) {
            toast.success(method === 'slip' ? "Enrollment successful! Awaiting verification." : "Enrollment Confirmed!");
            setShowPaymentModal(false);
            setSlipFiles([]);
            setRemark('');
            setSelectionLevel(0);
            setSelectedSubjects([]);
            
            axios.get('/student/my-enrolled-subjects').then(res => setEnrolledSubjects(res.data)).catch(e=>{});
            setActiveTab('history'); 
        }
    } catch (error) {
        toast.error("Failed to save enrollment. Please try again.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleBackNavigation = () => {
    if (selectionLevel > 0) {
      setSelectionLevel(prev => prev - 1);
      if (selectionLevel === 1) setSelectedBusiness(null);
      if (selectionLevel === 2) setSelectedBatch(null);
      if (selectionLevel === 3) { setPaymentPlan(null); setSelectedGroup(null); setSelectedSubjects([]); setActiveStream('All'); }
    }
  };

  const availableStreams = selectedBusiness ? [...parseStreams(selectedBusiness.streams).filter(s => s !== 'All'), 'All'] : ['All'];

  return (
    <div className="w-full h-full relative text-white pb-[100px] lg:pb-0"> 
        <div className="w-full mx-auto pb-6 md:pt-4">
            {selectionLevel > 0 && (
                <div className="mb-6 relative z-20">
                    <button onClick={handleBackNavigation} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-xl font-bold flex items-center transition-colors w-max border border-white/10">
                        <ArrowLeft size={18} className="mr-2" /> Back
                    </button>
                </div>
            )}

            <div className="w-full">
                
                {/* LEVEL 0 */}
                {selectionLevel === 0 && (
                    <div className="space-y-8 w-full animate-fade-in">
                      <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-8 text-center uppercase tracking-wide">All Courses</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {businesses.map(business => (
                          <div key={business.id} onClick={() => { setSelectedBusiness(business); setSelectionLevel(1); }}
                            className="cursor-pointer rounded-[2rem] overflow-hidden glass-card hover:border-red-400/50 transition-colors w-full flex flex-col group">
                            <div className="h-48 w-full relative border-b border-white/10 p-6 bg-black/20 flex items-center justify-center">
                               <img src={getImageUrl(business.logo)} alt="" className="max-w-full max-h-full object-contain" />
                            </div>
                            <div className="p-6 flex-1 flex items-center justify-center">
                              <h3 className="font-bold text-lg text-white text-center group-hover:text-red-400 transition-colors">{business.name}</h3>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                )}

                {/* LEVEL 1 */}
                {selectionLevel === 1 && (
                    <div className="space-y-8 w-full animate-fade-in">
                      <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-8 text-center uppercase tracking-wide">Select A Batch</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {getFilteredBatches().map(batch => (
                          <div key={batch.id} onClick={() => { setSelectedBatch(batch); setSelectionLevel(2); }}
                            className="cursor-pointer rounded-[2rem] glass-card hover:border-red-500/50 transition-colors flex flex-col sm:flex-row items-center p-4 md:p-6 group">
                            <div className="h-20 w-20 sm:h-28 sm:w-28 shrink-0 bg-white/5 rounded-2xl p-3 flex justify-center items-center border border-white/10 mx-auto sm:mx-0 mb-4 sm:mb-0">
                              <img src={getImageUrl(batch.logo || selectedBusiness.logo)} className="max-w-full max-h-full object-contain" alt="" />
                            </div>
                            <div className="p-2 sm:p-6 flex-1 flex flex-col justify-center items-center sm:items-start text-center sm:text-left">
                              <h4 className="font-bold text-white text-lg md:text-2xl group-hover:text-red-400 transition-colors">{batch.name}</h4>
                              {batch.duration && <p className="text-xs sm:text-sm text-white/60 mt-2 flex items-center gap-1.5 font-medium"><CalendarClock size={14} className="text-red-500"/> {batch.duration} Months</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                )}

                {/* LEVEL 2 */}
                {selectionLevel === 2 && (
                    <div className="space-y-8 w-full max-w-5xl mx-auto animate-fade-in">
                      <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-8 text-center uppercase tracking-wide">Select Payment Plan</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                        <div onClick={() => { setPaymentPlan('full'); setSelectionLevel(3); }} 
                             className={`cursor-pointer rounded-[2.5rem] p-8 md:p-14 text-center border transition-colors flex flex-col items-center justify-center ${paymentPlan === 'full' ? 'bg-red-600/20 border-red-500' : 'bg-black/20 border-white/10 hover:bg-black/40 hover:border-red-500/50'}`}>
                          <div className={`p-5 rounded-3xl mb-4 transition-colors ${paymentPlan === 'full' ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-white/50'}`}>
                            <Wallet size={48} strokeWidth={1.5} />
                          </div>
                          <h3 className="font-black text-xl md:text-3xl text-white mb-2">One-Time Payment</h3>
                          <p className="text-sm md:text-base text-white/60 font-medium">Pay upfront and unlock bundle discounts.</p>
                        </div>
                        <div onClick={() => { setPaymentPlan('monthly'); setSelectionLevel(3); }} 
                             className={`cursor-pointer rounded-[2.5rem] p-8 md:p-14 text-center border transition-colors flex flex-col items-center justify-center ${paymentPlan === 'monthly' ? 'bg-red-600/20 border-red-500' : 'bg-black/20 border-white/10 hover:bg-black/40 hover:border-red-500/50'}`}>
                          <div className={`p-5 rounded-3xl mb-4 transition-colors ${paymentPlan === 'monthly' ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-white/50'}`}>
                            <CreditCard size={48} strokeWidth={1.5} />
                          </div>
                          <h3 className="font-black text-xl md:text-3xl text-white mb-2">Monthly Payment</h3>
                          <p className="text-sm md:text-base text-white/60 font-medium">Pay your subject fees on a monthly basis.</p>
                        </div>
                      </div>
                    </div>
                )}

                {/* LEVEL 3 */}
                {selectionLevel === 3 && (
                    <div className="w-full animate-fade-in relative flex flex-col lg:flex-row gap-6">
                      
                      <div className="flex-1 glass-card rounded-[2rem] p-5 md:p-10 w-full border-white/10">
                          <div className="flex items-center space-x-3 mb-6 bg-white/5 p-3 rounded-2xl w-max border border-white/10">
                              <div className="w-10 h-10 rounded-xl bg-white/10 text-red-500 flex items-center justify-center shrink-0">
                                {paymentPlan === 'monthly' ? <CreditCard size={20} /> : <Wallet size={20} />}
                              </div>
                              <div className="pr-3">
                                  <h2 className="text-sm md:text-base font-extrabold text-white">{selectedBatch.name}</h2>
                                  <p className="text-red-400 mt-0.5 text-[10px] font-bold uppercase tracking-widest">{paymentPlan === 'full' ? 'One-Time Plan' : 'Monthly Plan'}</p>
                              </div>
                          </div>

                          <div className="mb-6">
                              <h4 className="text-xs font-bold text-white/50 mb-3 uppercase tracking-wider">Select Stream</h4>
                              <div className="flex flex-wrap gap-2">
                                  {availableStreams.map(stream => (
                                      <button key={stream} onClick={() => { setActiveStream(stream); setSelectedSubjects([]); }}
                                          className={`px-4 py-2 rounded-xl font-bold text-xs transition-colors ${
                                              activeStream === stream 
                                              ? 'bg-red-600 text-white border border-red-500' 
                                              : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                                          }`}>
                                          {stream}
                                      </button>
                                  ))}
                              </div>
                          </div>

                          {paymentPlan === 'monthly' && (
                            <div className="mb-6">
                              <h4 className="text-xs font-bold text-white/50 mb-3 uppercase tracking-wider">Select Month</h4>
                              <div className="flex flex-wrap gap-2">
                                {getFilteredGroups().map(group => (
                                  <button key={group.id} onClick={() => { setSelectedGroup(group); setSelectedSubjects([]); }}
                                    className={`px-4 py-2 rounded-xl font-bold text-xs transition-colors ${
                                      selectedGroup?.id === group.id 
                                      ? 'bg-red-600 text-white border border-red-500' 
                                      : 'bg-black/30 border border-white/10 text-white/60 hover:bg-black/50 hover:text-white'
                                    }`}>
                                    {group.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {paymentPlan === 'full' && getFilteredGroups().length > 0 && !selectedGroup && setSelectedGroup(getFilteredGroups()[0])}

                          {selectedGroup && (
                            <div className="space-y-3 pb-24 lg:pb-0"> 
                               <h4 className="text-xs font-bold text-white/50 mb-3 uppercase tracking-wider">Choose Subjects</h4>
                               
                               <div className="flex flex-col gap-3">
                                  {getFilteredCourses().map(course => {
                                    const isAlreadyPaid = enrolledSubjects.includes(course.id);

                                    return (
                                    <label key={course.id} className={`flex flex-row items-center justify-between p-3 md:p-4 rounded-xl border transition-colors ${
                                        isAlreadyPaid ? 'opacity-60 cursor-not-allowed bg-black/50 border-white/5' :
                                        selectedSubjects.includes(course.id) ? 'bg-red-600/10 border-red-500 cursor-pointer' : 'bg-black/20 border-white/10 hover:border-white/30 cursor-pointer'
                                      }`}>
                                      
                                      <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                                          <div className="relative flex items-center justify-center shrink-0">
                                              <input type="checkbox" disabled={isAlreadyPaid} className="w-5 h-5 rounded border-2 border-white/30 bg-black/50 text-red-600 focus:ring-red-600 cursor-pointer appearance-none checked:bg-red-600 checked:border-transparent disabled:opacity-50"
                                              checked={selectedSubjects.includes(course.id)} 
                                              onChange={() => setSelectedSubjects(prev => prev.includes(course.id) ? prev.filter(id => id !== course.id) : [...prev, course.id])} 
                                              />
                                              {selectedSubjects.includes(course.id) && <CheckCircle size={14} className="absolute text-white pointer-events-none" strokeWidth={3}/>}
                                          </div>
                                          
                                          <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                                              <span className="block font-bold text-white text-sm md:text-base truncate" title={course.name}>{course.name}</span>
                                              <div className="flex items-center gap-2">
                                                {course.code && <span className="text-[9px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 font-bold uppercase tracking-widest shrink-0">{course.code}</span>}
                                                {isAlreadyPaid && <span className="text-[9px] text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded font-bold uppercase tracking-widest shrink-0"><CheckCircle size={10} className="inline mr-1 mb-0.5"/> Paid</span>}
                                              </div>
                                          </div>
                                      </div>

                                      <div className="flex flex-col items-end shrink-0 ml-2">
                                          {getActiveDiscount() && selectedSubjects.includes(course.id) && !course.isDiscountExcluded && !isAlreadyPaid ? (
                                              <>
                                                  <span className="text-white/40 line-through text-[10px] font-medium mb-0.5">LKR {course.price}</span>
                                                  <span className="text-yellow-400 font-black text-sm md:text-base flex items-center gap-1"><Tag size={12}/> LKR {getActiveDiscount().newPricePerCourse}</span>
                                              </>
                                          ) : (
                                              <>
                                                  {course.isDiscountExcluded && selectedSubjects.includes(course.id) && !isAlreadyPaid && (
                                                      <span className="text-orange-400/80 text-[8px] uppercase tracking-widest font-bold mb-0.5">Fixed Price</span>
                                                  )}
                                                  <span className="text-red-400 font-black text-sm md:text-base">LKR {course.price}</span>
                                              </>
                                          )}
                                      </div>
                                    </label>
                                  )})}
                               </div>
                               {getFilteredCourses().length === 0 && <div className="text-center py-10 bg-white/5 rounded-2xl border border-white/10"><p className="text-white/50 font-medium text-sm">No subjects available.</p></div>}
                            </div>
                          )}
                      </div>

                      {/* Sticky Bar */}
                      <div className="fixed bottom-0 left-0 right-0 z-50 lg:relative lg:w-[340px] shrink-0">
                         <div className={`bg-slate-900 lg:bg-black/20 border-t lg:border border-white/10 lg:rounded-[2rem] p-4 lg:p-6 transition-opacity duration-200 ${calculateTotal() > 0 ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                            
                            <div className="hidden lg:block">
                                <h4 className="text-base font-extrabold text-white mb-4 uppercase tracking-widest border-b border-white/10 pb-3 flex items-center gap-2"><Wallet size={18} className="text-red-500"/> Order Summary</h4>
                                <div className="space-y-3 text-xs text-white/70 mb-6 font-medium">
                                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                        <span>Plan:</span> 
                                        <span className="font-bold text-white bg-white/10 px-2 py-1 rounded">{paymentPlan === 'full' ? 'One-Time' : 'Monthly'}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                        <span>Subjects Selected:</span> 
                                        <span className="font-bold text-white bg-red-600 px-2 py-1 rounded">{selectedSubjects.length}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-row lg:flex-col items-center lg:items-stretch justify-between gap-4">
                                <div>
                                    <span className="block text-[10px] text-white/50 uppercase font-bold tracking-widest mb-1 lg:text-center">Total Payable</span>
                                    <span className="block text-2xl lg:text-3xl text-white font-black lg:text-center lg:mb-4">LKR {calculateTotal().toFixed(2)}</span>
                                    {getActiveDiscount() && <p className="text-yellow-400 font-bold text-[10px] flex items-center lg:justify-center gap-1"><Tag size={10}/> Saved LKR {getOriginalTotal() - calculateTotal()}</p>}
                                </div>
                                <button onClick={handleProceedToPay} className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-black py-3 lg:py-4 px-6 lg:px-0 rounded-xl lg:rounded-2xl flex justify-center items-center transition-colors text-xs lg:text-sm uppercase tracking-widest border border-red-500/50 whitespace-nowrap">
                                    Proceed <ChevronRight className="ml-1" size={16}/>
                                </button>
                            </div>
                        </div>
                      </div>
                    </div>
                )}
            </div>
        </div>

        {/* 🔥 MODALS (z-[9999] purno priority) 🔥 */}
        {showInstallmentPrompt && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
                <div className="bg-slate-900 border border-white/10 rounded-[2rem] p-6 max-w-sm w-full relative shadow-2xl">
                    <button onClick={() => setShowInstallmentPrompt(false)} className="absolute top-4 right-4 text-white/50 hover:text-white bg-white/10 p-2 rounded-xl"><X size={18}/></button>
                    <h2 className="text-xl font-extrabold text-white mb-2">Payment Options</h2>
                    <p className="text-white/60 text-xs mb-6 font-medium">Pay the full amount now or choose installments.</p>
                    
                    <div className="flex flex-col gap-3">
                        <button onClick={() => { setFinalPaymentType('pay_full'); setShowInstallmentPrompt(false); setShowPaymentModal(true); }} 
                                className="w-full bg-white/5 hover:bg-red-600/20 border border-white/10 hover:border-red-500/50 text-left p-4 rounded-2xl transition-colors group">
                            <span className="block text-[10px] text-white/40 mb-1 uppercase tracking-widest font-bold group-hover:text-red-400">Option 1</span>
                            <span className="block text-sm text-white font-extrabold mb-1">Pay Full Amount</span>
                            <span className="block text-xl text-red-500 font-black">LKR {calculateTotal().toFixed(2)}</span>
                        </button>

                        <button onClick={() => { setFinalPaymentType('installment'); setShowInstallmentPrompt(false); setShowPaymentModal(true); }} 
                                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-left p-4 rounded-2xl transition-colors group">
                            <div className="flex justify-between items-start mb-1">
                                <span className="block text-[10px] text-white/40 uppercase tracking-widest font-bold">Option 2</span>
                                <span className="bg-yellow-500/20 text-yellow-400 text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border border-yellow-500/30">Available</span>
                            </div>
                            <span className="block text-sm text-white font-extrabold mb-3">Pay via Installments</span>

                            <div className="bg-black/40 rounded-xl p-3 mb-3 space-y-2 border border-white/5">
                                {availableInstallmentPlan && JSON.parse(availableInstallmentPlan.details).map((step, idx) => (
                                    <div key={idx} className="flex justify-between text-xs font-medium text-white/70">
                                        <span>Part {step.step}:</span>
                                        <span className="text-white font-bold bg-white/5 px-2 rounded border border-white/10">LKR {step.amount}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-red-600 text-white font-extrabold py-3 rounded-xl text-xs text-center shadow-lg">
                                Select & Pay LKR {availableInstallmentPlan ? JSON.parse(availableInstallmentPlan.details)[0]?.amount : 0} Today
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        )}

        {showPaymentModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
                <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 w-full max-w-md relative overflow-y-auto max-h-full custom-scrollbar shadow-2xl flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-extrabold text-white mb-1">Submit Payment</h2>
                            <p className="text-white/60 font-medium text-xs">Choose your payment method.</p>
                        </div>
                        <button onClick={() => setShowPaymentModal(false)} className="text-white/50 hover:text-white bg-white/10 p-2 rounded-xl shrink-0"><X size={18}/></button>
                    </div>
                    
                    <div className="bg-black/40 border border-white/10 rounded-2xl p-4 text-center mb-6 shadow-inner shrink-0">
                        <span className="block text-[10px] text-white/50 uppercase font-bold tracking-widest mb-1">Amount to Pay Now</span>
                        <span className="block text-3xl text-red-500 font-black">LKR {finalPaymentType === 'installment' && availableInstallmentPlan ? JSON.parse(availableInstallmentPlan.details)[0]?.amount : calculateTotal().toFixed(2)}</span>
                    </div>

                    <div className="flex gap-2 bg-black/30 p-1 rounded-2xl border border-white/10 mb-6 shrink-0">
                        <button onClick={() => setPaymentMethod('slip')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${paymentMethod === 'slip' ? 'bg-white/20 text-white border border-white/10 shadow' : 'text-white/40 hover:text-white/80'}`}>Bank Slip</button>
                        <button onClick={() => setPaymentMethod('payhere')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${paymentMethod === 'payhere' ? 'bg-white/20 text-white border border-white/10 shadow' : 'text-white/40 hover:text-white/80'}`}>Online / Card</button>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-1 mb-4">
                        {paymentMethod === 'slip' ? (
                            <>
                                {/* Click korlei Instruction Modal ashabe */}
                                <div className="border-2 border-dashed border-white/20 bg-white/5 rounded-[1.5rem] p-6 text-center hover:border-red-500/50 hover:bg-red-500/5 transition-colors cursor-pointer mb-4 group relative" onClick={openSlipInstructions}>
                                    <div className="absolute top-3 right-3 bg-blue-500 text-white p-1 rounded-full"><Info size={14}/></div>
                                    <input type="file" id="slip-upload" className="hidden" multiple accept="image/*,application/pdf" capture="environment" onChange={handleFileChange} />
                                    <div className="flex flex-col items-center w-full">
                                        <div className="flex gap-3 mb-3 text-white/30 group-hover:text-red-500 transition-colors">
                                            <UploadCloud size={32} />
                                            <Camera size={32} />
                                        </div>
                                        <span className="text-white font-bold text-sm mb-1">
                                            {slipFiles.length > 0 ? `${slipFiles.length} File(s) Selected` : 'Click to Upload Slip'}
                                        </span>
                                        <span className="text-[10px] text-white/50 font-medium">Max 4 slips. PNG, JPG, PDF</span>
                                    </div>
                                </div>
                                
                                {slipFiles.length > 0 && (
                                    <div className="mb-4 bg-black/30 p-3 rounded-xl border border-white/5 space-y-1.5">
                                        {slipFiles.map((file, i) => (
                                            <div key={i} className="flex justify-between items-center text-xs">
                                                <div className="flex items-center gap-2 truncate pr-3">
                                                    <Paperclip size={12} className="text-white/40 shrink-0"/>
                                                    <span className="text-white truncate">{file.name}</span>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="text-white/40">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                                                    <button onClick={() => removeFile(i)} className="text-red-400 hover:text-red-300"><X size={14}/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div>
                                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1 block">Remark (Optional)</label>
                                    <textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Type any message..." rows="2" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-red-500 transition-colors resize-none"></textarea>
                                </div>
                            </>
                        ) : (
                            <div className="bg-white/10 rounded-[1.5rem] p-6 flex flex-col justify-center items-center h-full min-h-[120px] border border-white/20">
                                <span className="text-white font-black text-2xl tracking-wider">Pay<span className="text-blue-500">Here</span></span>
                                <span className="text-[9px] text-white/40 uppercase mt-2 font-bold tracking-widest">Secured by Monid</span>
                            </div>
                        )}
                    </div>

                    <button onClick={handleFinalSubmit} disabled={isSubmitting} 
                        className="w-full shrink-0 bg-gradient-to-r from-red-600 to-red-800 text-white font-black py-3.5 rounded-xl transition-colors hover:from-red-500 hover:to-red-700 disabled:opacity-50 text-xs uppercase tracking-widest border border-red-500/50 shadow-lg">
                        {isSubmitting ? 'Processing...' : 'Confirm Payment'}
                    </button>
                </div>
            </div>
        )}

        {/* 🔥 SLIP INSTRUCTIONS POPUP 🔥 */}
        {showSlipInstructions && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 p-4 animate-in fade-in duration-200">
                <div className="bg-slate-900 border border-white/10 p-5 md:p-8 rounded-3xl max-w-2xl w-full shadow-2xl relative overflow-y-auto max-h-[90vh] custom-scrollbar">
                    <h3 className="text-lg md:text-2xl font-extrabold text-white mb-4 md:mb-6 border-b border-white/10 pb-3 md:pb-4">ස්ලිප් පත් උඩුගත කිරීමේ උපදෙස් (Slip Upload Instructions)</h3>
                    
                    <div className="space-y-4 md:space-y-6">
                        <div className="bg-black/50 p-4 md:p-5 rounded-2xl border border-white/5">
                            <h4 className="text-red-400 font-bold mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base"><Camera size={16}/> බැංකු ස්ලිප් (CDM / Bank Deposit)</h4>
                            <ul className="text-xs md:text-sm text-slate-300 list-disc pl-4 md:pl-5 space-y-1 md:space-y-2 leading-relaxed mb-4">
                                <li>ස්ලිප් පතෙහි <strong className="text-white">මුලු 4ම (4 corners)</strong> පැහැදිලිව පෙනෙන සේ ඡායාරූපය ගන්න.</li>
                                <li>ඡායාරූපය <strong className="text-white">බොඳ නොවී ඉතා පැහැදිලිව</strong> තිබිය යුතුය.</li>
                                <li><strong className="text-white">Reference Number, දිනය සහ වේලාව</strong> හොඳින් කියවිය හැකි විය යුතුය.</li>
                            </ul>
                            <div className="flex gap-2 md:gap-4">
                                <div className="flex-1 bg-white/5 border border-green-500/50 rounded-xl p-2 md:p-3 text-center flex flex-col justify-between">
                                    <img src={correctCdmImg} className="w-full h-20 md:h-28 object-contain rounded-lg mb-2" alt="Correct"/>
                                    <span className="text-green-400 text-[9px] md:text-xs font-bold uppercase flex justify-center items-center gap-1"><CheckCircle size={10}/> නිවැරදියි (Correct)</span>
                                </div>
                                <div className="flex-1 bg-white/5 border border-red-500/50 rounded-xl p-2 md:p-3 text-center flex flex-col justify-between">
                                    <img src={wrongCdmImg} className="w-full h-20 md:h-28 object-contain rounded-lg mb-2 opacity-50" alt="Wrong"/>
                                    <span className="text-red-400 text-[9px] md:text-xs font-bold uppercase flex justify-center items-center gap-1"><X size={10}/> වැරදියි (Incorrect)</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-black/50 p-4 md:p-5 rounded-2xl border border-white/5">
                            <h4 className="text-blue-400 font-bold mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base"><MonitorPlay size={16}/> Online Transfers / e-Receipts</h4>
                            <ul className="text-xs md:text-sm text-slate-300 list-disc pl-4 md:pl-5 space-y-1 md:space-y-2 leading-relaxed mb-4">
                                <li><strong className="text-white">Reference Number, දිනය සහ වේලාව</strong> අනිවාර්යයෙන්ම දිස්විය යුතුය.</li>
                                <li>ස්ක්‍රීන්ෂොට් එක (Screenshot) කපා-කොටා (crop) නොමැතිව <strong className="text-white">සම්පූර්ණයෙන්ම</strong> උඩුගත කරන්න.</li>
                            </ul>
                             <div className="flex gap-2 md:gap-4">
                                <div className="flex-1 bg-white/5 border border-green-500/50 rounded-xl p-2 md:p-3 text-center flex flex-col justify-between">
                                    <img src={correctReceiptImg} className="w-full h-20 md:h-28 object-contain rounded-lg mb-2 border border-white/20" alt="Correct"/>
                                    <span className="text-green-400 text-[9px] md:text-xs font-bold uppercase flex justify-center items-center gap-1"><CheckCircle size={10}/> නිවැරදියි (Correct)</span>
                                </div>
                                <div className="flex-1 bg-white/5 border border-red-500/50 rounded-xl p-2 md:p-3 text-center flex flex-col justify-between">
                                    <img src={wrongReceiptImg} className="w-full h-20 md:h-28 object-contain rounded-lg mb-2 opacity-50 border border-white/10" alt="Wrong"/>
                                    <span className="text-red-400 text-[9px] md:text-xs font-bold uppercase flex justify-center items-center gap-1"><X size={10}/> වැරදියි (Incorrect)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 md:mt-8 flex justify-end gap-3 md:gap-4">
                        <button onClick={() => setShowSlipInstructions(false)} className="px-4 md:px-6 py-2.5 md:py-3 rounded-xl bg-white/5 text-white/70 text-xs md:text-sm font-bold hover:bg-white/10 hover:text-white transition-colors">අවලංගු කරන්න (Cancel)</button>
                        <button onClick={confirmSlipInstructions} className="px-4 md:px-6 py-2.5 md:py-3 rounded-xl bg-red-600 text-white text-xs md:text-sm font-bold hover:bg-red-500 shadow-lg shadow-red-500/20 transition-colors">මම තේරුම් ගත්තා (Upload)</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default EnrollmentTab;