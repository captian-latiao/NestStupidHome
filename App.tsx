
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Layout } from './components/ui/Layout';
import { Heading, Subheading } from './components/ui/Typography';
import { WidgetSlot } from './components/dashboard/WidgetSlot';
import { useNestKernel } from './services/nestKernel';
import { UserRole, HomeMode, PetSpecies } from './types';
import { calculate_entropy } from './services/hygieneLogic'; 
import { calculate_pet_entropy, get_pet_status, PetCareStatus } from './services/petLogic';
import { Reorder, motion, AnimatePresence } from 'framer-motion';
import { 
  Bird, User, Home, Grid, SlidersHorizontal, Check, GripVertical, Coffee, Crown,
  ChevronRight, ChevronLeft, PenLine, UserPlus, Camera, X, Trash2, Upload, Moon, Cat,
  Sparkles, Clock, Dog, Plus, AlertCircle
} from 'lucide-react';

// Import Shared Components
import { Avatar, SleepCycleSlider } from './components/shared/Common';
import { DebugConsole } from './components/shared/DebugConsole';

// Import Module Registry
import { MODULE_LIST, MODULE_REGISTRY } from './modules';

// --- ARCHITECTURE DEFINITIONS ---

type MainTab = 'nest' | 'life' | 'me';

type ViewState = {
  tab: MainTab;
  subView?: 'home-management' | 'module-settings' | 'cleaning-config' | 'pet-config';
  targetModuleId?: string; // For Deep Linking from Home -> Life
};

// --- SUB-COMPONENTS ---

// Reusable Input Component for Config Items
const ConfigItemInput: React.FC<{
  value: number;
  onChange: (val: number) => void;
  unitLabel: string;
  onUnitToggle: () => void;
}> = ({ value, onChange, unitLabel, onUnitToggle }) => {
  const [localValue, setLocalValue] = useState(value.toString());
  const [error, setError] = useState(false);

  // Sync with prop changes (e.g. unit toggle or external reset)
  useEffect(() => {
    setLocalValue(value.toString());
    setError(false);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    
    // Valid input immediately updates parent
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
       setError(false);
       onChange(num);
    }
    // Invalid/Empty input does NOT update parent, keeping old valid value in state
    // but showing empty/invalid in UI until blur
  };

  const handleBlur = () => {
    const num = parseFloat(localValue);
    if (isNaN(num) || num <= 0) {
      setError(true);
      // We do not revert yet, effectively showing the user their mistake
      // The parent state still holds the last valid value.
    } else {
      // Reformat (e.g. "01" -> "1")
      setLocalValue(num.toString());
    }
  };

  return (
    <div className="relative">
      <div className={`flex items-center gap-2 border rounded-xl p-1.5 transition-colors ${error ? 'border-red-400 bg-red-50' : 'border-wood-200 bg-wood-50'}`}>
         <input 
            type="number"
            min="0.1"
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-12 bg-transparent text-center font-mono font-bold focus:outline-none ${error ? 'text-red-500' : 'text-wood-800'}`}
         />
         <button 
            onClick={onUnitToggle}
            className="bg-white/80 text-wood-600 px-2 py-1.5 rounded-lg text-xs font-bold min-w-[3rem] text-center shadow-sm border border-wood-100 hover:bg-white active:scale-95 transition-all"
         >
            {unitLabel}
         </button>
      </div>
      {error && (
         <motion.div 
            initial={{ opacity: 0, y: -5 }} 
            animate={{ opacity: 1, y: 0 }}
            className="absolute -bottom-5 right-0 text-[10px] text-red-500 font-bold flex items-center gap-1"
         >
            <AlertCircle size={10} /> 不可为0
         </motion.div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const { state, isLoaded, actions, systemTime } = useNestKernel();
  const [viewState, setViewState] = useState<ViewState>({ tab: 'nest' });
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  
  // Home Management States
  const [isEditingHomeName, setIsEditingHomeName] = useState(false);
  const [tempHomeName, setTempHomeName] = useState('');
  const homeNameInputRef = useRef<HTMLInputElement>(null);
  
  // Adding Member State
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberType, setNewMemberType] = useState<'HUMAN' | 'CAT' | 'DOG'>('HUMAN');

  // User Profile Editing States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempUserName, setTempUserName] = useState('');
  const [tempUserAvatar, setTempUserAvatar] = useState('');
  const userNameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Life Tab States
  const [lifeModuleIndex, setLifeModuleIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  
  // Swipe Refs
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Helper functions for Home Name Editing
  const startEditingHomeName = () => {
    setTempHomeName(state.homeName);
    setIsEditingHomeName(true);
  };

  const handleHomeNameSave = () => {
    if (tempHomeName.trim()) {
      actions.updateHomeName(tempHomeName.trim());
    }
    setIsEditingHomeName(false);
  };

  // Helper functions for User Profile Editing
  const startEditingProfile = () => {
    setTempUserName(state.user.name);
    setTempUserAvatar(state.user.avatarUrl || 'bg-wood-200');
    setIsEditingProfile(true);
  };

  const handleProfileSave = () => {
    if (tempUserName.trim()) {
      actions.updateUser(tempUserName.trim(), tempUserAvatar);
    }
    setIsEditingProfile(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempUserAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMember = () => {
    if (newMemberName.trim()) {
      if (newMemberType === 'HUMAN') {
        actions.addMember(newMemberName.trim());
      } else {
        const species = newMemberType === 'CAT' ? PetSpecies.CAT : PetSpecies.DOG;
        actions.addPet(newMemberName.trim(), species);
      }
      setNewMemberName('');
      setNewMemberType('HUMAN');
      setIsAddingMember(false);
    }
  };

  // --- GLOBAL CONTEXT ---
  const pets = state.members.filter(m => m.role === UserRole.PET);
  const hasPets = pets.length > 0;
  
  // Determine visible modules for Life Tab
  // MODIFIED: Sync with Home Order (state.moduleOrder) and filter disabled modules
  const visibleModules = useMemo(() => {
    return state.moduleOrder
      .map(id => MODULE_REGISTRY[id])
      .filter(m => {
         if (!m) return false;
         
         // Check if module is enabled in state config
         const enabledKey = `${m.id}Enabled` as keyof typeof state.modules;
         if (state.modules[enabledKey] === false) return false;

         // Special Pet Check
         if (m.id === 'pet' && !hasPets) return false;
         
         return true;
      });
  }, [state.moduleOrder, state.modules, hasPets]);

  // --- BUTLER LOGIC ENGINE ---
  
  const butlerMessage = useMemo(() => {
    if (!state.moduleData) return "喵... 军军正在启动系统...";

    const { pet, fridge, water, inventory } = state.moduleData;
    const hour = new Date(systemTime).getHours(); // Use System Time for greetings
    
    // 1. URGENT PRIORITY (Safety & Health)
    // Check Pet Crisis
    if (pet && pet.care_items && hasPets) {
      const petCount = state.members.filter(m => m.role === UserRole.PET).length || 1;
      const crisisItem = pet.care_items.find(item => {
        const p = calculate_pet_entropy(item, petCount, systemTime);
        return get_pet_status(p) === PetCareStatus.CRISIS;
      });
      if (crisisItem) {
        return `铲屎官！！${crisisItem.name.split('(')[0]}已经脏到没法用啦！本喵要离家出走了！😾`;
      }
      const staleItem = pet.care_items.find(item => {
        const p = calculate_pet_entropy(item, petCount, systemTime);
        return get_pet_status(p) === PetCareStatus.STALE;
      });
      if (staleItem) {
        return `喂... ${staleItem.name.split('(')[0]}有点味道了，是不是该动动手了？😼`;
      }
    }

    if (fridge && fridge.fridgeTemp > 8) {
      return "妈妈不好啦！冰箱发烧了，军军的小鱼干要坏掉了！快去看看！🌡️";
    }

    // 2. WARNING PRIORITY (Maintenance)
    if (inventory && inventory.items) {
      const lowStockCount = inventory.items.filter((i: any) => i.current_stock <= i.threshold).length;
      if (lowStockCount > 5) {
        return `家里 ${lowStockCount} 样东西缺货啦... 爸爸再不补货，猫猫就要闹了哦！📦`;
      }
    }
    
    // New Water Logic for Butler
    if (water) {
      const currentWater = water.current_level;
      if (water.max_capacity > 0 && currentWater < 2.0) { 
        return "咕噜... 水好像快喝完了？记得换水哦，不要渴着自己。💧";
      }
    }

    if (fridge && fridge.expiringCount > 3) {
      return `冰箱里有 ${fridge.expiringCount} 样东西快过期了，虽然军军不吃这些，但浪费是不对的！🍎`;
    }

    // 3. CONTEXTUAL / PLAYFUL (Normal State)
    if (state.homeMode === HomeMode.AWAY) {
      return "爸爸妈妈放心出门吧，军军会看好家的。不过回来记得带好吃的！👀";
    }

    if (state.homeMode === HomeMode.SLEEP) {
      return "嘘... 夜深了，爸爸妈妈快睡吧。猫猫也困了... 呼噜噜 💤";
    }

    if (hour < 9) return "早安！伸个懒腰，军军今天也是元气满满的一天喵~ ☀️";
    if (hour > 22) return "还不睡吗？熬夜会掉毛的哦... 就像军军一样... 🌙";
    
    const idleMessages = [
      "喵~ 阳光正好，妈妈要不要陪军军在阳台发呆？",
      "刚才抓到一只飞虫... 哎呀又飞走了！🦋",
      "家里一切正常，军军是不是很勤劳？爸爸快夸我！",
      "记得多喝水哦，爸爸妈妈要照顾好自己。",
      "什么时候开饭？军军的肚子在唱歌了..." 
    ];
    return idleMessages[Math.floor(Date.now() / 100000) % idleMessages.length];

  }, [state.moduleData, state.homeMode, state.members, systemTime, hasPets]);

  // --- EFFECTS ---

  // Scroll Reset Effect
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [viewState.tab, viewState.subView]);

  // Deep Link Handling
  useEffect(() => {
    if (viewState.tab === 'life' && viewState.targetModuleId) {
      const targetIndex = visibleModules.findIndex(m => m.id === viewState.targetModuleId);
      if (targetIndex !== -1) {
        if (targetIndex !== lifeModuleIndex) {
          setDirection(targetIndex > lifeModuleIndex ? 1 : -1);
          setLifeModuleIndex(targetIndex);
        }
        // Bug Fix: Consume the command immediately so it doesn't lock the view
        setViewState(prev => ({ ...prev, targetModuleId: undefined }));
      }
    }
  }, [viewState, lifeModuleIndex, visibleModules]);

  useEffect(() => {
    if (isEditingHomeName && homeNameInputRef.current) {
      homeNameInputRef.current.focus();
    }
  }, [isEditingHomeName]);

  useEffect(() => {
    if (isEditingProfile && userNameInputRef.current) {
      userNameInputRef.current.focus();
    }
  }, [isEditingProfile]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#FEFDF5] flex items-center justify-center">
        <span className="animate-pulse text-wood-400 font-serif text-xl">Nest Loading...</span>
      </div>
    );
  }

  // --- NAVIGATION HELPERS ---

  const navigateToModule = (moduleId: string) => {
    setViewState({ tab: 'life', targetModuleId: moduleId });
  };

  const handleLifeSwipe = (newDirection: number) => {
    const newIndex = lifeModuleIndex + newDirection;
    if (newIndex >= 0 && newIndex < visibleModules.length) {
      setDirection(newDirection);
      setLifeModuleIndex(newIndex);
    }
  };

  // --- HOME/NEST TAB RENDERER ---

  const renderNestTab = () => {
    // Filter active order based on enabled status
    const activeOrder = (state.moduleOrder || ['water', 'pet', 'fridge', 'inventory', 'hygiene']).filter(id => {
       const enabledKey = `${id}Enabled` as keyof typeof state.modules;
       if (state.modules[enabledKey] === false) return false;
       return true;
    });
    
    const petCount = pets.length;
    
    return (
      <div className="animate-[fadeIn_0.3s_ease-out] space-y-8 pb-24">
        <section>
          <Heading className="mb-2">
            {getGreeting()}，<span className="text-wood-600">{state.user.name}</span>
          </Heading>
        </section>

        <section>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 relative">
               <div className="h-12 w-12 rounded-full bg-wood-200 flex items-center justify-center border-2 border-white shadow-soft text-wood-800">
                 <Cat size={24} strokeWidth={2} />
               </div>
               <div className="absolute -bottom-1 -right-1 bg-wood-800 text-wood-50 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white">
                 军军
               </div>
            </div>
            <div className="flex-1 mt-1">
               <div className="relative bg-white p-4 rounded-2xl rounded-tl-sm shadow-sm border border-wood-100/50 text-wood-800 text-sm leading-relaxed">
                 <p>{butlerMessage}</p>
               </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <Subheading>认真生活中</Subheading>
            <button 
              onClick={() => setIsEditingLayout(!isEditingLayout)}
              className={`p-2 rounded-full transition-colors ${isEditingLayout ? 'bg-wood-800 text-wood-50' : 'text-wood-400 hover:bg-wood-100'}`}
            >
              {isEditingLayout ? <Check size={18} /> : <SlidersHorizontal size={18} />}
            </button>
          </div>
          
          {isEditingLayout ? (
            <Reorder.Group axis="y" values={activeOrder} onReorder={actions.reorderModules} className="space-y-3">
              {activeOrder.map((moduleId) => {
                const module = MODULE_REGISTRY[moduleId];
                if (!module) return null;
                // Only show pet module if pets exist
                if (moduleId === 'pet' && petCount === 0) return null;
                
                const isLoaded = true; 
                
                return (
                  <Reorder.Item key={moduleId} value={moduleId}>
                    <div className="relative bg-white/50 rounded-2xl border border-wood-100">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-wood-300 z-20">
                        <GripVertical size={20} />
                      </div>
                      <div className="pl-8">
                         <WidgetSlot title={module.title} icon={module.icon} isLoaded={isLoaded} />
                      </div>
                    </div>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {activeOrder.map((moduleId) => {
                 const module = MODULE_REGISTRY[moduleId];
                 if (!module) return null;
                 // Only show pet module if pets exist
                 if (moduleId === 'pet' && petCount === 0) return null;

                 const isLoaded = true;
                 // Dynamic Data Injection
                 const moduleData = {
                   ...state.moduleData?.[moduleId],
                   memberCount: state.members.length,
                   pets: pets // Inject pets list for PetWidget
                 };

                 return (
                   <WidgetSlot 
                      key={moduleId} 
                      title={module.title} 
                      icon={module.icon} 
                      isLoaded={isLoaded}
                      onClick={() => navigateToModule(moduleId)}
                   >
                      <module.Widget data={moduleData} systemTime={systemTime} />
                   </WidgetSlot>
                 );
               })}
            </div>
          )}
        </section>
      </div>
    );
  };

  // --- LIFE TAB RENDERER ---

  const renderLifeTab = () => {
    // Safety check for index
    let activeIndex = lifeModuleIndex;
    if (activeIndex >= visibleModules.length) {
        activeIndex = 0; 
    }
    
    const activeModule = visibleModules[activeIndex];
    const ActiveDetailView = activeModule.DetailView;
    
    // Inject global context into module data
    const moduleData = {
      ...state.moduleData?.[activeModule.id],
      memberCount: state.members.length,
      pets: pets
    };

    const onTouchStart = (e: React.TouchEvent) => {
      touchStartX.current = e.targetTouches[0].clientX;
    };
    
    const onTouchMove = (e: React.TouchEvent) => {
      touchEndX.current = e.targetTouches[0].clientX;
    };
    
    const onTouchEnd = () => {
      if (!touchStartX.current || !touchEndX.current) return;
      const distance = touchStartX.current - touchEndX.current;
      const isLeftSwipe = distance > 50;
      const isRightSwipe = distance < -50;
      
      if (isLeftSwipe && activeIndex < visibleModules.length - 1) {
        handleLifeSwipe(1);
      }
      if (isRightSwipe && activeIndex > 0) {
        handleLifeSwipe(-1);
      }
      
      touchStartX.current = 0;
      touchEndX.current = 0;
    };

    return (
      <div className="h-full flex flex-col pb-24 relative">
        {/* GLOBAL DEBUG CONSOLE (Top Level for Life Tab) */}
        <DebugConsole systemTime={systemTime} actions={actions} />

        {/* Segment Control */}
        <div className="pt-4 pb-6 sticky top-0 z-30 bg-sun-light/95 backdrop-blur-sm">
          <div className="bg-wood-100/50 p-1 rounded-2xl flex relative overflow-x-auto no-scrollbar">
            {visibleModules.map((module, index) => {
               const isActive = activeIndex === index;
               return (
                 <button
                   key={module.id}
                   onClick={() => {
                     setDirection(index > activeIndex ? 1 : -1);
                     setLifeModuleIndex(index);
                   }}
                   className={`flex-1 min-w-[60px] relative z-10 py-2.5 text-xs font-medium transition-colors duration-200 text-center whitespace-nowrap px-2 ${isActive ? 'text-wood-900 font-bold' : 'text-wood-400'}`}
                 >
                   {isActive && (
                     <motion.div
                       layoutId="segment-pill"
                       className="absolute inset-0 bg-white rounded-xl shadow-sm border border-wood-100/50 -z-10"
                       transition={{ type: "spring", stiffness: 300, damping: 30 }}
                     />
                   )}
                   {module.title}
                 </button>
               )
            })}
          </div>
        </div>

        {/* Content Area */}
        <div 
          className="flex-1 relative overflow-hidden min-h-[500px]"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
           <AnimatePresence initial={false} custom={direction} mode="wait">
             <motion.div
               key={activeIndex}
               custom={direction}
               variants={{
                 enter: (direction: number) => ({
                   x: direction > 0 ? 50 : -50,
                   opacity: 0,
                   scale: 0.98
                 }),
                 center: {
                   zIndex: 1,
                   x: 0,
                   opacity: 1,
                   scale: 1
                 },
                 exit: (direction: number) => ({
                   zIndex: 0,
                   x: direction < 0 ? 50 : -50,
                   opacity: 0,
                   scale: 0.98
                 })
               }}
               initial="enter"
               animate="center"
               exit="exit"
               transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
               className="h-full"
             >
               <ActiveDetailView data={moduleData} actions={actions} systemTime={systemTime} />
             </motion.div>
           </AnimatePresence>
        </div>
      </div>
    );
  };

  // --- HOME MANAGEMENT RENDERER ---

  const renderHomeManagement = () => (
    <div className="animate-[slideIn_0.3s_ease-out] space-y-8 pb-24">
      <div className="flex items-center gap-2 mb-6">
        <button 
          onClick={() => setViewState({ tab: 'me' })}
          className="p-2 -ml-2 text-wood-500 hover:bg-wood-100 rounded-full transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <Heading className="!text-2xl !mb-0">家庭管理</Heading>
      </div>

      <div className="bg-gradient-to-br from-wood-800 to-wood-700 p-6 rounded-3xl text-wood-50 shadow-lg relative overflow-hidden">
         <div className="absolute top-0 right-0 p-32 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
         <div className="relative z-10">
           <div className="text-wood-200 text-xs font-medium tracking-widest uppercase mb-1">NEST HOME</div>
           {isEditingHomeName ? (
             <div className="flex items-center gap-2">
               <input
                 ref={homeNameInputRef}
                 type="text"
                 value={tempHomeName}
                 onChange={(e) => setTempHomeName(e.target.value)}
                 onBlur={handleHomeNameSave}
                 onKeyDown={(e) => e.key === 'Enter' && handleHomeNameSave()}
                 className="bg-wood-900/30 border-b border-wood-400 text-2xl font-serif font-bold w-full focus:outline-none py-1"
               />
               <button onClick={handleHomeNameSave} className="p-2 bg-wood-600 rounded-full"><Check size={16} /></button>
             </div>
           ) : (
             <div onClick={startEditingHomeName} className="flex items-center gap-3 cursor-pointer group">
                <h2 className="text-3xl font-serif font-bold">{state.homeName}</h2>
                <PenLine size={18} className="opacity-0 group-hover:opacity-100 transition-opacity text-wood-300" />
             </div>
           )}
           <p className="mt-4 text-wood-200 text-sm flex items-center gap-2">
             <User size={14} /> {state.members.filter(m => m.role !== UserRole.PET).length} 位成员 · {state.members.filter(m => m.role === UserRole.PET).length} 只宠物
           </p>
         </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-wood-100/50 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
           <div className="p-1.5 bg-indigo-50 text-indigo-500 rounded-lg"><Moon size={16} /></div>
           <Subheading className="!text-base !mb-0">作息规律 (Biological Clock)</Subheading>
        </div>
        
        <SleepCycleSlider 
           start={state.moduleData.water.sleep_window.start}
           end={state.moduleData.water.sleep_window.end}
           onChange={actions.updateSleepWindow}
        />

        <p className="text-xs text-wood-400 mt-3 px-1">
          * 此设置将作为全屋设备的参考生物钟，影响饮水预测、设备静音等逻辑。
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <Subheading>家庭成员 & 宠物</Subheading>
        </div>
        <div className="grid grid-cols-1 gap-3">
           {state.members.map((member) => (
             <div key={member.id} className="bg-white p-4 rounded-2xl border border-wood-100/50 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <Avatar url={member.avatarUrl} size="h-12 w-12" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-wood-900">{member.name}</span>
                      {member.isCurrentUser && <span className="text-[10px] bg-wood-50 text-wood-400 px-1.5 py-0.5 rounded border border-wood-100">我</span>}
                    </div>
                    <span className="text-xs text-wood-400 flex items-center gap-1">
                      {member.role === UserRole.OWNER ? '一家之主' : (member.role === UserRole.PET ? (member.species === PetSpecies.CAT ? '🐱 猫咪' : '🐶 狗狗') : '家庭成员')}
                    </span>
                  </div>
                </div>
                {member.role === UserRole.OWNER && <Crown size={16} className="text-wood-400" />}
                {state.user.role === UserRole.OWNER && member.role !== UserRole.OWNER && (
                  <button 
                    onClick={() => actions.removeMember(member.id)}
                    className="p-2 text-wood-300 hover:text-red-400 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
             </div>
           ))}
           
           {isAddingMember ? (
             <div className="bg-white border-2 border-wood-200 p-4 rounded-2xl animate-[fadeIn_0.2s_ease-out]">
                <div className="flex items-center gap-2 mb-3">
                    <div className="h-10 w-10 bg-wood-100 rounded-full flex items-center justify-center text-wood-400">
                       <UserPlus size={18} />
                    </div>
                    <input
                       autoFocus
                       value={newMemberName}
                       onChange={(e) => setNewMemberName(e.target.value)}
                       placeholder="输入名字"
                       className="flex-1 bg-transparent border-none focus:outline-none text-wood-800 placeholder-wood-300 font-medium"
                    />
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                   <button 
                     onClick={() => setNewMemberType('HUMAN')} 
                     className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${newMemberType === 'HUMAN' ? 'bg-wood-800 text-white border-wood-800' : 'bg-white text-wood-400 border-wood-100'}`}
                   >
                     人类
                   </button>
                   <button 
                     onClick={() => setNewMemberType('CAT')} 
                     className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${newMemberType === 'CAT' ? 'bg-orange-100 text-orange-600 border-orange-200' : 'bg-white text-wood-400 border-wood-100'}`}
                   >
                     猫猫
                   </button>
                   <button 
                     onClick={() => setNewMemberType('DOG')} 
                     className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${newMemberType === 'DOG' ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-white text-wood-400 border-wood-100'}`}
                   >
                     狗狗
                   </button>
                </div>

                <div className="flex items-center justify-end gap-2">
                   <button onClick={() => setIsAddingMember(false)} className="p-2 text-wood-400"><X size={18} /></button>
                   <button 
                     onClick={handleAddMember} 
                     disabled={!newMemberName.trim()}
                     className="px-4 py-2 bg-wood-800 text-wood-50 rounded-xl flex items-center gap-2 font-bold text-xs disabled:opacity-50"
                   >
                     <Check size={14} /> 添加
                   </button>
                </div>
             </div>
           ) : (
             <button onClick={() => setIsAddingMember(true)} className="bg-white border-2 border-dashed border-wood-200 p-4 rounded-2xl flex items-center justify-center gap-2 text-wood-500 hover:bg-wood-50 hover:border-wood-300 transition-all active:scale-[0.98]">
               <div className="p-1 bg-wood-100 rounded-full"><Plus size={16} /></div>
               <span className="font-medium text-sm">添加成员 / 宠物</span>
             </button>
           )}
        </div>
      </div>
    </div>
  );

  // --- MODULE SETTINGS RENDERER ---

  const renderModuleSettings = () => (
    <div className="animate-[slideIn_0.3s_ease-out] space-y-8 pb-24">
      <div className="flex items-center gap-2 mb-6">
        <button 
          onClick={() => setViewState({ tab: 'me' })}
          className="p-2 -ml-2 text-wood-500 hover:bg-wood-100 rounded-full transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <Heading className="!text-2xl !mb-0">模块设置</Heading>
      </div>

      <div className="space-y-3">
        <button 
          onClick={() => setViewState({ tab: 'me', subView: 'cleaning-config' })} 
          className="w-full bg-white p-4 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm border border-wood-100"
        >
           <div className="flex items-center gap-4">
              <div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-xl shadow-sm border border-yellow-100"><Sparkles size={20} /></div>
              <div className="text-left">
                <span className="block font-medium text-wood-800">清洁管理</span>
                <span className="text-xs text-wood-400">设置各区域/物品的打扫频率阈值</span>
              </div>
           </div>
           <ChevronRight size={18} className="text-wood-300 group-hover:text-wood-500" />
        </button>

        <button 
          onClick={() => setViewState({ tab: 'me', subView: 'pet-config' })} 
          className="w-full bg-white p-4 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm border border-wood-100"
        >
           <div className="flex items-center gap-4">
              <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl shadow-sm border border-orange-100"><Cat size={20} /></div>
              <div className="text-left">
                <span className="block font-medium text-wood-800">宠物管理</span>
                <span className="text-xs text-wood-400">设置铲屎、喂食等护理周期</span>
              </div>
           </div>
           <ChevronRight size={18} className="text-wood-300 group-hover:text-wood-500" />
        </button>
      </div>
    </div>
  );

  // --- CLEANING CONFIG RENDERER ---

  const renderCleaningConfig = () => {
    const items = state.moduleData.hygiene.items;

    const unitMap = {
      DAYS: { label: '天', mul: 1 },
      WEEKS: { label: '周', mul: 7 },
      MONTHS: { label: '月', mul: 30 },
    };

    return (
      <div className="animate-[slideIn_0.3s_ease-out] space-y-8 pb-24">
        <div className="flex items-center gap-2 mb-6">
          <button 
            onClick={() => setViewState({ tab: 'me', subView: 'module-settings' })}
            className="p-2 -ml-2 text-wood-500 hover:bg-wood-100 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <Heading className="!text-2xl !mb-0">清洁管理</Heading>
        </div>
        
        <div className="bg-wood-50/50 p-4 rounded-2xl border border-wood-100 text-sm text-wood-600 leading-relaxed mb-6">
           <p>在此调整各类物品的建议清洁周期。系统将根据这些阈值和实际打扫时间来计算物品的 "熵增" (变脏程度)。</p>
        </div>

        <div className="space-y-4">
           {items.map(item => {
             // Logic to determine display unit: use stored preferred_unit OR fallback
             const unitKey = item.preferred_unit || 'DAYS';
             const unitConfig = unitMap[unitKey];
             
             // Base is DAYS. Display = Base / Multiplier
             const displayValue = parseFloat((item.base_interval_days / unitConfig.mul).toFixed(1));

             return (
               <div key={item.id} className="bg-white p-4 rounded-2xl border border-wood-100 shadow-sm flex items-center justify-between">
                  <div>
                     <h3 className="font-bold text-wood-800">{item.name}</h3>
                     <span className="text-xs text-wood-400 bg-wood-50 px-1.5 py-0.5 rounded">{item.is_public_area ? '公共区域' : '私有区域'}</span>
                  </div>
                  
                  <ConfigItemInput 
                    value={displayValue}
                    unitLabel={unitConfig.label}
                    onChange={(newVal) => {
                       // New Value in Display Unit -> Convert to Base Days
                       const newDays = newVal * unitConfig.mul;
                       actions.updateHygieneItemConfig(item.id, newDays, unitKey);
                    }}
                    onUnitToggle={() => {
                       // Cycle: DAYS -> WEEKS -> MONTHS -> DAYS
                       let nextUnit: 'DAYS' | 'WEEKS' | 'MONTHS' = 'DAYS';
                       if (unitKey === 'DAYS') nextUnit = 'WEEKS';
                       else if (unitKey === 'WEEKS') nextUnit = 'MONTHS';
                       
                       const nextConfig = unitMap[nextUnit];

                       // Convert Base Days to new Base Days to preserve Display Value
                       // Old Base = Display * Old Mul
                       // New Base = Display * New Mul
                       // We want Display to remain same (e.g. 1 Day -> 1 Week)
                       
                       // To clarify requirement: "Unit switching mode... number stays same"
                       // So if I have 1 (Week), and switch to Month, it becomes 1 (Month).
                       // New Base Days = Current Display Value * New Multiplier
                       const newBaseDays = displayValue * nextConfig.mul;
                       
                       actions.updateHygieneItemConfig(item.id, newBaseDays, nextUnit);
                    }}
                  />
               </div>
             );
           })}
        </div>
      </div>
    );
  };

  // --- PET CONFIG RENDERER (Updated Logic) ---

  const renderPetConfig = () => {
    const items = state.moduleData.pet.care_items;

    return (
      <div className="animate-[slideIn_0.3s_ease-out] space-y-8 pb-24">
        <div className="flex items-center gap-2 mb-6">
          <button 
            onClick={() => setViewState({ tab: 'me', subView: 'module-settings' })}
            className="p-2 -ml-2 text-wood-500 hover:bg-wood-100 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <Heading className="!text-2xl !mb-0">宠物管理</Heading>
        </div>
        
        <div className="bg-wood-50/50 p-4 rounded-2xl border border-wood-100 text-sm text-wood-600 leading-relaxed mb-6">
           <p>在此调整宠物护理任务的周期。小于 24 小时的任务建议按小时设置，长期任务按天设置。</p>
        </div>

        <div className="space-y-4">
           {items.map(item => {
             // Logic to determine display unit: use stored preferred_unit OR fallback
             const unit = item.preferred_unit || (item.base_interval_hours >= 24 && item.base_interval_hours % 24 === 0 ? 'DAYS' : 'HOURS');
             const displayValue = unit === 'DAYS' ? item.base_interval_hours / 24 : item.base_interval_hours;
             
             return (
               <div key={item.id} className="bg-white p-4 rounded-2xl border border-wood-100 shadow-sm flex items-center justify-between">
                  <div>
                     <h3 className="font-bold text-wood-800">{item.name}</h3>
                     <span className="text-xs text-wood-400 bg-wood-50 px-1.5 py-0.5 rounded">{item.is_shared ? '公共任务' : '独立任务'}</span>
                  </div>
                  
                  <ConfigItemInput 
                    value={displayValue}
                    unitLabel={unit === 'DAYS' ? '天' : '小时'}
                    onChange={(newVal) => {
                       // Update Base Hours
                       const newHours = unit === 'DAYS' ? newVal * 24 : newVal;
                       actions.updatePetItemConfig(item.id, newHours, unit);
                    }}
                    onUnitToggle={() => {
                        const newUnit = unit === 'DAYS' ? 'HOURS' : 'DAYS';
                        // Preserve Display Value
                        let newTotalHours = item.base_interval_hours;
                        if (unit === 'DAYS') {
                            // Was Days, Now Hours. 
                            // E.g. 1 Day (24h) -> 1 Hour (1h).
                            // New Total = Display (1) * 1 = 1.
                            newTotalHours = displayValue;
                        } else {
                            // Was Hours, Now Days.
                            // E.g. 1 Hour (1h) -> 1 Day (24h).
                            // New Total = Display (1) * 24 = 24.
                            newTotalHours = displayValue * 24;
                        }
                        actions.updatePetItemConfig(item.id, newTotalHours, newUnit);
                    }}
                  />
               </div>
             );
           })}
        </div>
      </div>
    );
  };

  const renderMeTab = () => (
    <div className="animate-[fadeIn_0.3s_ease-out] space-y-8 pb-24 pt-4">
       {/* User Profile Card */}
       {isEditingProfile ? (
          <div className="bg-white p-6 rounded-3xl shadow-lg border border-wood-200 flex flex-col gap-5 animate-[scaleIn_0.2s_ease-out]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-wood-400 uppercase tracking-widest">编辑资料</span>
              <button onClick={() => setIsEditingProfile(false)} className="text-wood-400 p-1 bg-wood-50 rounded-full"><X size={18} /></button>
            </div>
            
            <div className="flex items-center gap-5">
              <div 
                className="relative h-20 w-20 group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                 <Avatar url={tempUserAvatar} size="h-20 w-20" />
                 <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={20} className="text-white" />
                 </div>
                 <input 
                   ref={fileInputRef}
                   type="file" 
                   accept="image/*" 
                   onChange={handleFileChange} 
                   className="hidden" 
                 />
              </div>
              <div className="flex-1">
                <label className="text-xs text-wood-400 mb-1 block">昵称</label>
                <input 
                  ref={userNameInputRef}
                  value={tempUserName}
                  onChange={(e) => setTempUserName(e.target.value)}
                  className="w-full text-2xl font-serif font-bold text-wood-900 bg-wood-50 border-b-2 border-wood-200 focus:border-wood-500 focus:outline-none py-1 px-2 rounded-t-lg transition-colors"
                  placeholder="请输入昵称"
                />
              </div>
            </div>

            <div className="bg-wood-50/50 p-3 rounded-xl flex items-center gap-3 text-xs text-wood-500 cursor-pointer hover:bg-wood-50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                <div className="p-2 bg-white rounded-lg shadow-sm text-wood-400"><Upload size={14} /></div>
                <span>点击头像或此处上传图片 (建议 1:1)</span>
            </div>

            <button 
              onClick={handleProfileSave}
              className="w-full bg-wood-800 text-wood-50 py-3 rounded-xl font-medium shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Check size={18} /> 保存更改
            </button>
          </div>
       ) : (
          <div className="bg-white p-6 rounded-3xl shadow-soft border border-wood-100/50 flex items-center gap-5 relative group">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={startEditingProfile}
                  className="p-2 bg-wood-50 text-wood-500 rounded-full hover:bg-wood-100 transition-colors"
                >
                  <PenLine size={16} />
                </button>
              </div>
              
              <Avatar url={state.user.avatarUrl} size="h-20 w-20" />

              <div onClick={startEditingProfile} className="cursor-pointer flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-serif font-bold text-wood-900 text-2xl">{state.user.name}</h2>
                  {state.user.role === UserRole.OWNER && (
                    <span className="bg-wood-100 text-wood-800 text-[10px] px-2 py-0.5 rounded-full border border-wood-200 font-bold flex items-center gap-1"><Crown size={10} fill="currentColor" /> 一家之主</span>
                  )}
                </div>
                <p className="text-wood-400 text-sm">{state.homeName}</p>
              </div>
          </div>
       )}

       <div className="space-y-3">
          <button onClick={() => setViewState({ tab: 'me', subView: 'home-management' })} className="w-full bg-white/60 p-4 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all">
             <div className="flex items-center gap-4">
                <div className="p-2.5 bg-white rounded-xl text-wood-500 shadow-sm border border-wood-50"><Home size={20} /></div>
                <span className="font-medium text-wood-800">家庭管理</span>
             </div>
             <ChevronRight size={18} className="text-wood-300 group-hover:text-wood-500" />
          </button>
          <button onClick={() => setViewState({ tab: 'me', subView: 'module-settings' })} className="w-full bg-white/60 p-4 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all">
             <div className="flex items-center gap-4">
                <div className="p-2.5 bg-white rounded-xl text-wood-500 shadow-sm border border-wood-50"><Grid size={20} /></div>
                <span className="font-medium text-wood-800">模块设置</span>
             </div>
             <ChevronRight size={18} className="text-wood-300 group-hover:text-wood-500" />
          </button>
       </div>
    </div>
  );

  const getGreeting = () => {
    const hour = new Date(systemTime).getHours(); // Use systemTime for greeting too
    if (hour < 6) return '夜深了';
    if (hour < 11) return '早上好';
    if (hour < 13) return '中午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  const NavButton = ({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center w-20 h-full group">
      <div className={`transition-colors duration-300 ${active ? 'text-wood-800' : 'text-wood-300 group-hover:text-wood-400'}`}>
         <Icon size={26} strokeWidth={2} className={`transition-all duration-500 ease-in-out ${active ? 'fill-wood-800' : 'fill-transparent'}`} />
      </div>
      <div className="h-4 flex items-center justify-center overflow-hidden w-full">
        <span className={`text-[10px] font-bold tracking-wide mt-1 transition-opacity duration-300 transform ${active ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
      </div>
    </button>
  );

  return (
    <Layout>
      {viewState.tab === 'nest' && (
        <header className="relative flex justify-between items-center py-6 mb-2 z-40">
          <div className="flex items-center gap-3 text-wood-800">
             <div className="p-2.5 bg-wood-800 text-wood-50 rounded-2xl shadow-sm"><Bird size={22} fill="currentColor" strokeWidth={1.5} /></div>
             <span className="font-serif font-bold text-2xl tracking-tight text-wood-900">Nest</span>
          </div>
        </header>
      )}

      <main className="min-h-[calc(100vh-140px)]">
        {viewState.tab === 'nest' && renderNestTab()}
        {viewState.tab === 'life' && renderLifeTab()}
        
        {viewState.tab === 'me' && (
           <>
              {!viewState.subView && renderMeTab()}
              {viewState.subView === 'home-management' && renderHomeManagement()}
              {viewState.subView === 'module-settings' && renderModuleSettings()}
              {viewState.subView === 'cleaning-config' && renderCleaningConfig()}
              {viewState.subView === 'pet-config' && renderPetConfig()}
           </>
        )}
      </main>
      
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-wood-100/50 pb-safe z-50">
        <div className="max-w-md mx-auto px-6 h-20 flex items-center justify-between md:max-w-2xl lg:max-w-4xl">
           <NavButton active={viewState.tab === 'nest'} onClick={() => setViewState({ tab: 'nest' })} icon={Bird} label="Nest" />
           <NavButton active={viewState.tab === 'life'} onClick={() => setViewState({ tab: 'life' })} icon={Coffee} label="生活" />
           <NavButton active={viewState.tab === 'me'} onClick={() => setViewState({ tab: 'me' })} icon={User} label="我的" />
        </div>
      </div>
    </Layout>
  );
};

export default App;
