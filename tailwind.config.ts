
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Arabic Business Hub colors
				'arab-blue': {
					DEFAULT: '#1e4b94',
					light: '#2a5fb3',
					dark: '#173b76'
				},
				'arab-gray': {
					DEFAULT: '#f6f6f7',
					light: '#ffffff',
					dark: '#e0e0e2'
				},
				// New color palette (شبكة الألوان الجديدة)
				'arab-purple': {
					DEFAULT: '#8B5CF6',
					light: '#C4B5FD',
					dark: '#7C3AED'
				},
				'arab-teal': {
					DEFAULT: '#2DD4BF',
					light: '#99F6E4',
					dark: '#0D9488'
				},
				'arab-amber': {
					DEFAULT: '#F59E0B',
					light: '#FCD34D',
					dark: '#D97706'
				},
				'arab-rose': {
					DEFAULT: '#F43F5E',
					light: '#FDA4AF',
					dark: '#E11D48'
				},
				// New vibrant colors (ألوان زاهية جديدة)
				'arab-emerald': {
					DEFAULT: '#10B981',
					light: '#6EE7B7',
					dark: '#059669'
				},
				'arab-indigo': {
					DEFAULT: '#6366F1',
					light: '#A5B4FC',
					dark: '#4F46E5'
				},
				'arab-orange': {
					DEFAULT: '#F97316',
					light: '#FDBA74',
					dark: '#C2410C'
				},
				'arab-sky': {
					DEFAULT: '#0EA5E9',
					light: '#7DD3FC',
					dark: '#0369A1'
				},
				'arab-lime': {
					DEFAULT: '#84CC16',
					light: '#BEF264',
					dark: '#65A30D'
				},
				// الألوان الجديدة المطلوب إضافتها
				'arab-pink': {
					DEFAULT: '#EC4899',
					light: '#F9A8D4',
					dark: '#BE185D'
				},
				'arab-cyan': {
					DEFAULT: '#06B6D4',
					light: '#A5F3FC',
					dark: '#0E7490'
				},
				'arab-fuchsia': {
					DEFAULT: '#D946EF',
					light: '#F5D0FE',
					dark: '#A21CAF'
				},
				'arab-red': {
					DEFAULT: '#EF4444',
					light: '#FCA5A5',
					dark: '#B91C1C'
				},
				'arab-yellow': {
					DEFAULT: '#EAB308',
					light: '#FEF08A',
					dark: '#A16207'
				},
			},
			fontFamily: {
				sans: ['Cairo', 'sans-serif'],
				cairo: ['Cairo', 'sans-serif'],
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			},
			backgroundImage: {
				'arab-gradient': 'linear-gradient(135deg, #1e4b94 0%, #2a70c8 100%)',
				'arab-purple-gradient': 'linear-gradient(135deg, #8B5CF6 0%, #C4B5FD 100%)',
				'arab-teal-gradient': 'linear-gradient(135deg, #2DD4BF 0%, #99F6E4 100%)',
				'arab-amber-gradient': 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)',
				'arab-rose-gradient': 'linear-gradient(135deg, #F43F5E 0%, #FDA4AF 100%)',
				// New gradient backgrounds (خلفيات متدرجة جديدة)
				'arab-emerald-gradient': 'linear-gradient(135deg, #10B981 0%, #6EE7B7 100%)',
				'arab-indigo-gradient': 'linear-gradient(135deg, #6366F1 0%, #A5B4FC 100%)',
				'arab-orange-gradient': 'linear-gradient(135deg, #F97316 0%, #FDBA74 100%)',
				'arab-sky-gradient': 'linear-gradient(135deg, #0EA5E9 0%, #7DD3FC 100%)',
				'arab-lime-gradient': 'linear-gradient(135deg, #84CC16 0%, #BEF264 100%)',
				'arab-sunset-gradient': 'linear-gradient(135deg, #F97316 0%, #F43F5E 100%)',
				'arab-ocean-gradient': 'linear-gradient(135deg, #0EA5E9 0%, #2DD4BF 100%)',
				'arab-forest-gradient': 'linear-gradient(135deg, #10B981 0%, #84CC16 100%)',
				'arab-lavender-gradient': 'linear-gradient(135deg, #8B5CF6 0%, #F43F5E 100%)',
				'arab-golden-gradient': 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)',
				// الخلفيات المتدرجة الجديدة المطلوب إضافتها
				'arab-pink-gradient': 'linear-gradient(135deg, #EC4899 0%, #F9A8D4 100%)',
				'arab-cyan-gradient': 'linear-gradient(135deg, #06B6D4 0%, #A5F3FC 100%)',
				'arab-fuchsia-gradient': 'linear-gradient(135deg, #D946EF 0%, #F5D0FE 100%)',
				'arab-red-gradient': 'linear-gradient(135deg, #EF4444 0%, #FCA5A5 100%)',
				'arab-yellow-gradient': 'linear-gradient(135deg, #EAB308 0%, #FEF08A 100%)',
				'arab-rainbow-gradient': 'linear-gradient(135deg, #6366F1 0%, #D946EF 50%, #F43F5E 100%)',
				'arab-sunset-new-gradient': 'linear-gradient(135deg, #EAB308 0%, #F97316 50%, #EF4444 100%)',
				'arab-ocean-new-gradient': 'linear-gradient(135deg, #06B6D4 0%, #0EA5E9 50%, #2DD4BF 100%)',
				'arab-nature-gradient': 'linear-gradient(135deg, #84CC16 0%, #10B981 50%, #0EA5E9 100%)',
				'arab-luxury-gradient': 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #F59E0B 100%)',
			},
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
