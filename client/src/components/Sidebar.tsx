import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import logoImg from "../assets/logo.png";
import { 
  Tooltip, 
  TooltipTrigger, 
  TooltipContent, 
  TooltipProvider 
} from "@/components/ui/tooltip";
import { 
  ChevronLeft, 
  ChevronRight,
  Home, 
  FileText, 
  BarChart2, 
  Users, 
  Settings, 
  Database, 
  Cloud,
  ClipboardCheck,
  LineChart,
  HelpCircle,
  BrainCircuit,
  MessageSquare,
  Image,
  BarChart,
  Calculator,
  UserCog,
  Building,
  ChevronDown,
  ChevronUp,
  Layers,
  CalendarDays,
  ArrowUpRight,
  BookOpen,
  Shield,
  School,
  GraduationCap,
  Clock,
  Bell
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  toggleCollapsed: () => void;
  isMobile?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, toggleCollapsed, isMobile = false }) => {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, isAdmin, instituteName } = useAuth();
  const { t } = useTranslation();
  const [expandedSections, setExpandedSections] = useState({
    main: true,
    user: false,
    ai: false,
    admin: false
  });
  
  // Funció per alternar l'estat d'expansió d'una secció
  const toggleSection = (section: 'main' | 'user' | 'ai' | 'admin') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  const menuItems = [
    { 
      label: t('sidebar.menu.home'), 
      icon: <Home size={20} className="text-blue-500" />, 
      href: "/", 
      active: location === "/",
      tooltip: t('sidebar.tooltips.home')
    },
    { 
      label: t('sidebar.menu.evaluation'), 
      icon: <ClipboardCheck size={20} className="text-green-500" />, 
      href: "/evaluation", 
      active: location === "/evaluation",
      tooltip: t('sidebar.tooltips.evaluation')
    },
    { 
      label: t('sidebar.menu.attendance'), 
      icon: <Clock size={20} className="text-amber-500" />, 
      href: "/attendance", 
      active: location === "/attendance",
      tooltip: t('sidebar.tooltips.attendance')
    },
    { 
      label: t('sidebar.menu.guards'), 
      icon: <Shield size={20} className="text-purple-500" />, 
      href: "/guards", 
      active: location === "/guards",
      tooltip: t('sidebar.tooltips.guards')
    },
    { 
      label: t('sidebar.menu.surveys'), 
      icon: <FileText size={20} className="text-cyan-500" />, 
      href: "/surveys", 
      active: location === "/surveys",
      tooltip: t('sidebar.tooltips.surveys')
    },
    { 
      label: t('sidebar.menu.resources'), 
      icon: <BookOpen size={20} className="text-orange-500" />, 
      href: "/resources", 
      active: location === "/resources",
      tooltip: t('sidebar.tooltips.resources')
    },
    { 
      label: t('sidebar.menu.analytics'), 
      icon: <BarChart2 size={20} className="text-indigo-500" />, 
      href: "/analytics", 
      active: location === "/analytics",
      tooltip: t('sidebar.tooltips.analytics')
    }
  ];

  const adeptifyItems = [
    {
      label: t('sidebar.menu.adeptify.competencies'),
      icon: <GraduationCap size={18} className="text-blue-400" />,
      href: "/adeptify/competencies",
      active: location.startsWith("/adeptify/competencies")
    },
    {
      label: t('sidebar.menu.adeptify.evaluations'),
      icon: <ClipboardCheck size={18} className="text-green-400" />,
      href: "/adeptify/evaluations",
      active: location.startsWith("/adeptify/evaluations")
    },
    {
      label: t('sidebar.menu.adeptify.courses'),
      icon: <School size={18} className="text-purple-400" />,
      href: "/adeptify/courses",
      active: location.startsWith("/adeptify/courses")
    },
    {
      label: t('sidebar.menu.adeptify.learningActivities'),
      icon: <Layers size={18} className="text-amber-400" />,
      href: "/adeptify/learning-activities",
      active: location.startsWith("/adeptify/learning-activities")
    }
  ];

  const assistatutItems = [
    {
      label: t('sidebar.menu.assistatut.guardDuties'),
      icon: <Shield size={18} className="text-blue-400" />,
      href: "/assistatut/guard-duties",
      active: location.startsWith("/assistatut/guard-duties")
    },
    {
      label: t('sidebar.menu.assistatut.attendance'),
      icon: <Clock size={18} className="text-green-400" />,
      href: "/assistatut/attendance",
      active: location.startsWith("/assistatut/attendance")
    },
    {
      label: t('sidebar.menu.assistatut.schedules'),
      icon: <CalendarDays size={18} className="text-purple-400" />,
      href: "/assistatut/schedules",
      active: location.startsWith("/assistatut/schedules")
    },
    {
      label: t('sidebar.menu.assistatut.communications'),
      icon: <MessageSquare size={18} className="text-amber-400" />,
      href: "/assistatut/communications",
      active: location.startsWith("/assistatut/communications")
    }
  ];

  const adminItems = [
    {
      label: t('sidebar.menu.admin.users'),
      icon: <Users size={18} className="text-blue-400" />,
      href: "/admin/users",
      active: location.startsWith("/admin/users")
    },
    {
      label: t('sidebar.menu.admin.institutes'),
      icon: <Building size={18} className="text-green-400" />,
      href: "/admin/institutes",
      active: location.startsWith("/admin/institutes")
    },
    {
      label: t('sidebar.menu.admin.settings'),
      icon: <Settings size={18} className="text-purple-400" />,
      href: "/admin/settings",
      active: location.startsWith("/admin/settings")
    }
  ];

  const renderMenuItem = (item: any, isSubItem = false) => {
    const itemContent = (
      <Link href={item.href}>
        <div className={`
          flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer
          ${item.active 
            ? 'bg-primary text-primary-foreground' 
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }
          ${isSubItem ? 'ml-4' : ''}
        `}>
          {item.icon}
          {!collapsed && <span className="ml-3">{item.label}</span>}
        </div>
      </Link>
    );

    if (collapsed) {
      return (
        <TooltipProvider key={item.href}>
          <Tooltip>
            <TooltipTrigger asChild>
              {itemContent}
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{item.tooltip || item.label}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return <div key={item.href}>{itemContent}</div>;
  };

  const renderSection = (title: string, items: any[], sectionKey: 'main' | 'user' | 'ai' | 'admin') => {
    if (collapsed) {
      return (
        <div className="space-y-1">
          {items.map(item => renderMenuItem(item))}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
        >
          <span>{title}</span>
          {expandedSections[sectionKey] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {expandedSections[sectionKey] && (
          <div className="space-y-1">
            {items.map(item => renderMenuItem(item, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`
      fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-40
      ${collapsed ? 'w-16' : 'w-64'}
      ${isMobile ? 'w-64' : ''}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!collapsed && (
          <div className="flex items-center">
            <img src={logoImg} alt="Logo" className="h-8 w-8 mr-2" />
            <span className="text-lg font-semibold text-gray-900">GEI Platform</span>
          </div>
        )}
        <button
          onClick={toggleCollapsed}
          className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-4 overflow-y-auto">
        {/* Main Menu */}
        <div className="space-y-1">
          {menuItems.map(item => renderMenuItem(item))}
        </div>

        {/* Adeptify Section */}
        {isAuthenticated && (
          <div className="pt-4 border-t border-gray-200">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {!collapsed && "Adeptify"}
            </h3>
            {renderSection("Adeptify", adeptifyItems, 'ai')}
          </div>
        )}

        {/* Assistatut Section */}
        {isAuthenticated && (
          <div className="pt-4 border-t border-gray-200">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {!collapsed && "Assistatut"}
            </h3>
            {renderSection("Assistatut", assistatutItems, 'user')}
          </div>
        )}

        {/* Admin Section */}
        {isAuthenticated && isAdmin && (
          <div className="pt-4 border-t border-gray-200">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {!collapsed && "Administració"}
            </h3>
            {renderSection("Administració", adminItems, 'admin')}
          </div>
        )}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <p className="font-medium">{instituteName || "Institut"}</p>
            <p>GEI Unified Platform</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar; 