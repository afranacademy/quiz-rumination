import React from "react";
import { View, Text, Image } from "@react-pdf/renderer";
import { PDF_COLORS } from "../theme/colors";
import { PDF_TYPOGRAPHY } from "../theme/typography";
import { PDF_LAYOUT } from "../theme/layout";
import { PDF_RTL } from "../theme/rtl";

interface PdfBrandHeaderProps {
  title: string;
  subtitle?: string;
  showLogo?: boolean;
}

/**
 * Branded header component for PDF pages
 * RTL-native with logo and title in a row, intrinsic height
 */
export const PdfBrandHeader: React.FC<PdfBrandHeaderProps> = ({
  title,
  subtitle,
  showLogo = true,
}) => {
  // Logo path - using PNG from public folder
  const logoPath = "/logo/logo afran white.png";

  return (
    <View style={PDF_LAYOUT.header}>
      <View style={PDF_RTL.rowRtl}>
        {showLogo && (
          <>
            <Image
              src={logoPath}
              style={{
                width: 28,
                height: 28,
              }}
            />
            <View style={{ marginLeft: 24 }} />
          </>
        )}
        <View style={{ flex: 1 }}>
          <Text
            style={[
              PDF_TYPOGRAPHY.headerTitle,
              PDF_RTL.rtlText,
              { color: PDF_COLORS.primaryDarkest, marginBottom: subtitle ? 4 : 0 },
            ]}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[
                PDF_TYPOGRAPHY.headerSubtitle,
                PDF_RTL.rtlText,
                { color: PDF_COLORS.textLight },
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

