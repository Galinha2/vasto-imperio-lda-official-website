import AppKit
import Foundation
import PDFKit

guard CommandLine.arguments.count == 4 else {
  fatalError("Usage: swift rebrand-porteco.swift source.pdf logo.png output.pdf")
}

let source = URL(fileURLWithPath: CommandLine.arguments[1])
let logoURL = URL(fileURLWithPath: CommandLine.arguments[2])
let output = URL(fileURLWithPath: CommandLine.arguments[3])
guard let document = PDFDocument(url: source), let logo = NSImage(contentsOf: logoURL) else {
  fatalError("Could not open source document or Vasto logo")
}

func whiteMask(_ page: PDFPage, _ rect: NSRect) {
  let note = PDFAnnotation(bounds: rect, forType: .square, withProperties: nil)
  note.color = .white
  note.interiorColor = .white
  let border = PDFBorder(); border.lineWidth = 0
  note.border = border
  page.addAnnotation(note)
}

func stamp(_ page: PDFPage, _ rect: NSRect) {
  let note = PDFAnnotation(bounds: rect, forType: .stamp, withProperties: nil)
  note.image = logo
  page.addAnnotation(note)
}

// The source's supplier footer is a vertical strip at the far right of page 2.
// Its oversized supplier mark occupies the lower-left empty margin. Both masks
// sit outside the technical drawings, preserving the original diagrams.
if let page = document.page(at: 1) {
  whiteMask(page, NSRect(x: 552, y: 0, width: 43, height: 155))
  whiteMask(page, NSRect(x: 15, y: 0, width: 225, height: 118))
  stamp(page, NSRect(x: 27, y: 29, width: 112, height: 30))
}

// Add a discreet Vasto mark to the first page while retaining all original art.
if let page = document.page(at: 0) {
  stamp(page, NSRect(x: 22, y: 786, width: 90, height: 24))
}

guard document.write(to: output) else { fatalError("Could not write the rebranded PDF") }
