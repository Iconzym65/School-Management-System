import { GraduationCap } from 'lucide-react';

export const INSTITUTION_CONFIG = {
    name: import.meta.env.VITE_INSTITUTION_NAME || 'Apex Institute of Technology & Science',
    shortName: import.meta.env.VITE_INSTITUTION_SHORT_NAME || 'ApexEdu',
    logoUrl: import.meta.env.VITE_INSTITUTION_LOGO_URL || '',
    logoIcon: GraduationCap,
};
