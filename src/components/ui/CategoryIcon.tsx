import React from 'react';
import RestaurantOutlined from '@mui/icons-material/RestaurantOutlined';
import DinnerDiningOutlined from '@mui/icons-material/DinnerDiningOutlined';
import ShoppingCartOutlined from '@mui/icons-material/ShoppingCartOutlined';
import DirectionsCarOutlined from '@mui/icons-material/DirectionsCarOutlined';
import FlightOutlined from '@mui/icons-material/FlightOutlined';
import LocalGasStationOutlined from '@mui/icons-material/LocalGasStationOutlined';
import ShoppingBagOutlined from '@mui/icons-material/ShoppingBagOutlined';
import TheatersOutlined from '@mui/icons-material/TheatersOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import FlashOnOutlined from '@mui/icons-material/FlashOnOutlined';
import LocalHospitalOutlined from '@mui/icons-material/LocalHospitalOutlined';
import MedicationOutlined from '@mui/icons-material/MedicationOutlined';
import FitnessCenterOutlined from '@mui/icons-material/FitnessCenterOutlined';
import CreditCardOutlined from '@mui/icons-material/CreditCardOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import AccountBalanceOutlined from '@mui/icons-material/AccountBalanceOutlined';
import AttachMoneyOutlined from '@mui/icons-material/AttachMoneyOutlined';
import SavingsOutlined from '@mui/icons-material/SavingsOutlined';
import CategoryOutlined from '@mui/icons-material/CategoryOutlined';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import PetsOutlined from '@mui/icons-material/PetsOutlined';
import CardGiftcardOutlined from '@mui/icons-material/CardGiftcardOutlined';
import CoffeeOutlined from '@mui/icons-material/CoffeeOutlined';
import SmartphoneOutlined from '@mui/icons-material/SmartphoneOutlined';
import SportsEsportsOutlined from '@mui/icons-material/SportsEsportsOutlined';

interface CategoryIconProps {
  category?: string;
  accountType?: 'bank' | 'cash' | 'credit_card' | 'savings' | string;
  type?: 'bank' | 'cash' | 'credit_card' | 'savings' | string;
  icon?: string;
  name?: string;
  className?: string;
  fontSize?: 'inherit' | 'small' | 'medium' | 'large';
}

const CATEGORY_MAP: Record<string, React.ComponentType<{ className?: string; fontSize?: any }>> = {
  food: RestaurantOutlined,
  dining: DinnerDiningOutlined,
  groceries: ShoppingCartOutlined,
  grocery: ShoppingCartOutlined,
  transport: DirectionsCarOutlined,
  fuel: LocalGasStationOutlined,
  travel: FlightOutlined,
  shopping: ShoppingBagOutlined,
  entertainment: TheatersOutlined,
  bills: ReceiptLongOutlined,
  utilities: FlashOnOutlined,
  health: LocalHospitalOutlined,
  medical: MedicationOutlined,
  gym: FitnessCenterOutlined,
  'gym supplies': FitnessCenterOutlined,
  'gym supplise': FitnessCenterOutlined,
  emi: CreditCardOutlined,
  income: PaymentsOutlined,
  salary: PaymentsOutlined,
  investment: TrendingUpOutlined,
  personal: PersonOutlined,
  education: SchoolOutlined,
  home: HomeOutlined,
  coffee: CoffeeOutlined,
  gaming: SportsEsportsOutlined,
  gadgets: SmartphoneOutlined,
  gifts: CardGiftcardOutlined,
  pets: PetsOutlined,
};

const ACCOUNT_MAP: Record<string, React.ComponentType<{ className?: string; fontSize?: any }>> = {
  bank: AccountBalanceOutlined,
  cash: AttachMoneyOutlined,
  credit_card: CreditCardOutlined,
  savings: SavingsOutlined,
};

// Check if string contains an emoji (for backward compatibility with legacy custom category data)
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

export function CategoryIcon({
  category = '',
  accountType,
  type,
  icon,
  name,
  className = 'w-4 h-4',
  fontSize = 'inherit',
}: CategoryIconProps) {
  const effectiveType = accountType || type;
  const effectiveIcon = icon || name;

  // 1. Account type icon resolution
  if (effectiveType && ACCOUNT_MAP[effectiveType.toLowerCase()]) {
    const Component = ACCOUNT_MAP[effectiveType.toLowerCase()];
    return <Component className={className} fontSize={fontSize} />;
  }

  // 2. Custom icon key resolution
  if (effectiveIcon) {
    const cleanKey = effectiveIcon.toLowerCase().trim();
    if (CATEGORY_MAP[cleanKey]) {
      const Component = CATEGORY_MAP[cleanKey];
      return <Component className={className} fontSize={fontSize} />;
    }
    if (ACCOUNT_MAP[cleanKey]) {
      const Component = ACCOUNT_MAP[cleanKey];
      return <Component className={className} fontSize={fontSize} />;
    }
    // Backward compatibility: If the user explicitly saved an emoji as their custom icon, render it cleanly
    if (EMOJI_REGEX.test(effectiveIcon)) {
      return <span className="inline-block leading-none select-none text-[1.1em]">{effectiveIcon}</span>;
    }
  }

  // 3. Category name resolution
  const normalizedCategory = category.toLowerCase().trim();
  const IconComponent = CATEGORY_MAP[normalizedCategory] || CategoryOutlined;

  return <IconComponent className={className} fontSize={fontSize} />;
}

export default CategoryIcon;
