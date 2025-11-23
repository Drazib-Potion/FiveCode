interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Loader({ size = 'md', className = '' }: LoaderProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-5 h-5 border-[3px]',
    lg: 'w-6 h-6 border-[3px]',
  };

  return (
    <div
      className={`${sizeClasses[size]} border-gray-300 border-t-purple rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Chargement en cours"
    />
  );
}

