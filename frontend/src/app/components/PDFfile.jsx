"use client";
import React from "react";
import { Page, Text, Image, Document, StyleSheet } from "@react-pdf/renderer";
const PDFfile = () => {
  const styles = StyleSheet.create({});
  return (
    <Document>
      <Page>
        <Text></Text>
        <Image src="/blck.jpeg" />
      </Page>
    </Document>
  );
};

export default PDFfile;
