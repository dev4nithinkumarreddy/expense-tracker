import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

/**
 * Official Google 4-Color "G" Emblem for Google Pay
 */
export const GooglePayIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M44.5 20H24V28.5H35.8C34.7 34.3 29.8 37 24 37C16.8 37 11 31.2 11 24C11 16.8 16.8 11 24 11C27.1 11 29.8 12.1 32 14.1L38.4 7.7C34.5 4.1 29.6 2 24 2C11.8 2 2 11.8 2 24C2 36.2 11.8 46 24 46C36.2 46 45 36.5 45 24C45 22.6 44.8 21.3 44.5 20Z"
      fill="#4285F4"
    />
    <path
      d="M6.3 14.7L13.2 19.8C15.1 14.7 19.2 11 24 11C27.1 11 29.8 12.1 32 14.1L38.4 7.7C34.5 4.1 29.6 2 24 2C16.7 2 10.3 7.3 6.3 14.7Z"
      fill="#EA4335"
    />
    <path
      d="M24 46C29.4 46 34.2 44.1 38 40.7L31.5 35.3C29.4 36.6 26.8 37.3 24 37.3C18.3 37.3 13.5 33.7 11.8 28.6L4.8 33.9C8.8 41.2 15.8 46 24 46Z"
      fill="#34A853"
    />
    <path
      d="M44.5 20H24V28.5H35.8C35.2 31.4 33.7 33.8 31.5 35.3L38 40.7C42.1 36.9 44.8 31.2 44.8 24C44.8 22.6 44.6 21.3 44.5 20Z"
      fill="#4285F4"
    />
    <path
      d="M11.8 28.6C11.3 27.2 11 25.6 11 24C11 22.4 11.3 20.8 11.8 19.4L4.8 14.1C3.1 17.1 2 20.4 2 24C2 27.6 3.1 30.9 4.8 33.9L11.8 28.6Z"
      fill="#FBBC05"
    />
  </svg>
);

/**
 * Official PhonePe Purple Rounded Squircle with Devanagari "पे" Symbol
 */
export const PhonePeIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <rect width="48" height="48" rx="12" fill="#5F259F" />
    <path
      d="M24 10H17V38H23V30H27C31.4 30 35 26.4 35 22C35 17.6 31.4 14 27 14L32 10H24ZM23 25V19H26.5C28.2 19 29.5 20.3 29.5 22C29.5 23.7 28.2 25 26.5 25H23Z"
      fill="white"
    />
    {/* Stylized slanted stroke forming the Devanagari Pe ligature */}
    <path
      d="M27.5 13.5L34 8H26.5L20 13.5H27.5Z"
      fill="white"
    />
  </svg>
);

/**
 * Official Paytm Dual-Color Badge ("Pay" in Deep Blue, "tm" in Cyan)
 */
export const PaytmIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <rect width="48" height="48" rx="12" fill="#F4F8FB" stroke="#E2E8F0" strokeWidth="1.5" />
    <text
      x="7"
      y="31"
      fontFamily="system-ui, -apple-system, sans-serif"
      fontWeight="900"
      fontSize="17"
      fill="#002E6E"
      letterSpacing="-0.5"
    >
      Pay
    </text>
    <text
      x="31"
      y="31"
      fontFamily="system-ui, -apple-system, sans-serif"
      fontWeight="900"
      fontSize="17"
      fill="#00BAF2"
      letterSpacing="-0.5"
    >
      tm
    </text>
  </svg>
);

/**
 * Official NPCI Unified Payments Interface (UPI) Logo
 */
export const UpiIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <rect width="48" height="48" rx="12" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
    {/* Left green triangle */}
    <path d="M12 33L22 15L27 24L17 33H12Z" fill="#097939" />
    {/* Right orange triangle */}
    <path d="M21 33L31 15L36 24L26 33H21Z" fill="#E85A1D" />
  </svg>
);
