export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface NavigationItem {
  label: string;
  href: string;
}

export interface FeatureCard {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export interface FooterLink {
  href: string;
  label: string;
}

export interface FooterSection {
  title: string;
  links: FooterLink[];
}

export interface AuthFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface DashboardMetric {
  title: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  color: string;
}