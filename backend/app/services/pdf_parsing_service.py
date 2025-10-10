import pdfplumber
from typing import List, Dict, Any
import logging

from app.schemas.chunk import ParsedPage, ParsedTextElement

logger = logging.getLogger(__name__)

def parse_pdf_with_pdfplumber(file_path: str) -> List[ParsedPage]:
    """
    Parses a PDF file using pdfplumber to extract text elements with their
    bounding boxes from each page.

    Args:
        file_path: The local path to the PDF file.

    Returns:
        A list of ParsedPage objects, each containing details of a page
        and its extracted text elements.
        
    Raises:
        FileNotFoundError: If the PDF file does not exist at the given path.
        pdfplumber.exceptions.PDFSyntaxError: If the PDF is malformed or password-protected.
        Exception: For other potential errors during PDF processing.
    """
    parsed_pages_data: List[ParsedPage] = []

    try:
        with pdfplumber.open(file_path) as pdf:
            for i, page_obj in enumerate(pdf.pages):
                current_page_number = i + 1
                current_page_width = float(page_obj.width)
                current_page_height = float(page_obj.height)
                
                extracted_elements: List[ParsedTextElement] = []

                # Extract words with their bounding boxes and other attributes
                # x_tolerance and y_tolerance can be adjusted based on document structure
                # use_text_flow=True helps in ordering text logically
                words = page_obj.extract_words(
                    x_tolerance=1, 
                    y_tolerance=3, 
                    keep_blank_chars=False, 
                    use_text_flow=True, 
                    extra_attrs=["fontname", "size"]
                )

                for word in words:
                    # pdfplumber's coordinates are typically from the top-left.
                    # 'x0', 'top', 'x1', 'bottom' are keys for word bounding boxes.
                    # 'text' is the word itself.
                    element = ParsedTextElement(
                        text=word['text'],
                        x0=float(word['x0']),
                        y0=float(word['top']), # pdfplumber uses 'top' for y0
                        x1=float(word['x1']),
                        y1=float(word['bottom']), # pdfplumber uses 'bottom' for y1
                        # Populate page context for each element
                        page_number=current_page_number,
                        page_width=current_page_width,
                        page_height=current_page_height
                        # fontname=word.get('fontname'), # Example of accessing extra_attrs
                        # size=word.get('size')
                    )
                    extracted_elements.append(element)
                
                # ParsedPage now contains elements that are fully context-aware
                parsed_page_schema_obj = ParsedPage(
                    page_number=current_page_number,
                    width=current_page_width,
                    height=current_page_height,
                    elements=extracted_elements
                )
                parsed_pages_data.append(parsed_page_schema_obj)
                
            logger.info(f"Successfully parsed {len(pdf.pages)} pages from '{file_path}' using pdfplumber.")

    except FileNotFoundError:
        logger.error(f"PDF file not found at path: {file_path}")
        raise
    except pdfplumber.exceptions.PDFSyntaxError as e:
        logger.error(f"PDFSyntaxError for file '{file_path}': {e}. The PDF might be malformed or password-protected.")
        raise
    except Exception as e:
        logger.error(f"An unexpected error occurred while parsing PDF '{file_path}' with pdfplumber: {e}", exc_info=True)
        raise
        
    return parsed_pages_data

# Placeholder for the main service function that could switch between parsers
def parse_pdf(file_path: str, parser_type: str = "pdfplumber") -> List[ParsedPage]:
    """
    Main PDF parsing function. Currently defaults to pdfplumber.
    Can be extended to support other parsers like pypdfium2.

    Args:
        file_path: The local path to the PDF file.
        parser_type: The type of parser to use (e.g., "pdfplumber", "pypdfium2").

    Returns:
        A list of ParsedPage objects.
    """
    logger.info(f"Parsing PDF '{file_path}' using parser: {parser_type}")
    if parser_type == "pdfplumber":
        return parse_pdf_with_pdfplumber(file_path)
    # elif parser_type == "pypdfium2":
    #     # return parse_pdf_with_pypdfium2(file_path) # To be implemented in Phase 6
    #     logger.warning("pypdfium2 parser not yet implemented. Falling back to pdfplumber.")
    #     return parse_pdf_with_pdfplumber(file_path)
    else:
        logger.error(f"Unsupported parser type: {parser_type}. Defaulting to pdfplumber.")
        # Or raise an error: raise ValueError(f"Unsupported parser type: {parser_type}")
        return parse_pdf_with_pdfplumber(file_path)

# Example usage (for testing this module directly):
# if __name__ == '__main__':
#     # Configure basic logging for testing
#     logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
#     
#     # Create a dummy PDF for testing if you don't have one
#     # For a real test, replace 'dummy.pdf' with an actual PDF path
#     test_pdf_path = 'dummy.pdf' 
#     
#     try:
#         # Create a simple dummy PDF using fpdf2 if it doesn't exist
#         from fpdf import FPDF
#         import os
#         if not os.path.exists(test_pdf_path):
#             pdf = FPDF()
#             pdf.add_page()
#             pdf.set_font("Arial", size=12)
#             pdf.cell(200, 10, txt="Hello World! This is page 1.", ln=1, align="C")
#             pdf.add_page()
#             pdf.set_font("Arial", size=12)
#             pdf.cell(200, 10, txt="This is some text on page 2.", ln=1, align="L")
#             pdf.multi_cell(0, 10, txt="Another line here.\nAnd a third line for testing word extraction and bounding boxes.")
#             pdf.output(test_pdf_path, "F")
#             logger.info(f"Created dummy PDF: {test_pdf_path}")

#         logger.info(f"Attempting to parse PDF: {test_pdf_path}")
#         parsed_data = parse_pdf(test_pdf_path)
#         
#         if parsed_data:
#             logger.info(f"Successfully parsed {len(parsed_data)} pages.")
#             for page_data in parsed_data:
#                 logger.info(f"Page Number: {page_data.page_number}, Width: {page_data.width}, Height: {page_data.height}")
#                 logger.info(f"Found {len(page_data.elements)} text elements on page {page_data.page_number}.")
#                 if page_data.elements:
#                     # Log only the first few elements to avoid verbose output
#                     for i, element in enumerate(page_data.elements[:3]):
#                         logger.info(f"  Element {i+1}: '{element.text}' (x0:{element.x0:.2f}, y0:{element.y0:.2f}, x1:{element.x1:.2f}, y1:{element.y1:.2f})")
#                     if len(page_data.elements) > 3:
#                         logger.info(f"  ... and {len(page_data.elements) - 3} more elements.")
#         else:
#             logger.warning("Parsing returned no data.")
#             
#     except Exception as e:
#         logger.error(f"Error during test parsing: {e}", exc_info=True) 