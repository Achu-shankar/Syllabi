from pydantic import BaseModel, Field
from typing import Optional, List

from app.schemas.reference import ItemTypeEnum

class Author(BaseModel):
    full_name: Optional[str] = Field(None, description="Full name of the author as it appears in the publication. Aim for 'LastName, FirstName' or 'FirstName LastName'.")
    given_name: Optional[str] = Field(None, description="Given (first) name of the author, if parsable.")
    family_name: Optional[str] = Field(None, description="Family (last) name of the author, if parsable.")
    # affiliation: Optional[str] = Field(None, description="Author's institutional affiliation, if available.") # Future consideration
    # orcid: Optional[str] = Field(None, description="Author's ORCID identifier, if available.") # Future consideration

class PublicationDate(BaseModel):
    year: Optional[int] = Field(None, description="Year of publication (e.g., 2023).")
    month: Optional[int] = Field(None, description="Month of publication (1-12), if available.")
    day: Optional[int] = Field(None, description="Day of publication, if available.")

class ExtractedMetadata(BaseModel):
    # --- Core Identification ---
    title: Optional[str] = Field(None, description="The full primary title of the document.")
    short_title: Optional[str] = Field(None, description="A shortened version of the title, if applicable (e.g., for running heads or some citation styles).")
    authors: Optional[List[Author]] = Field(default_factory=list, description="List of authors. The LLM should attempt to parse given and family names.")
    abstract: Optional[str] = Field(None, description="The abstract or summary of the document.")
    keywords: Optional[List[str]] = Field(default_factory=list, description="A list of keywords, key phrases, or subject terms.")

    # --- Publication & Date Information ---
    publication_date: Optional[PublicationDate] = Field(None, description="The primary publication date (year, month, day).")
    publisher: Optional[str] = Field(None, description="The publisher of the work (e.g., publishing house, university press).")
    publisher_place: Optional[str] = Field(None, description="The city or location of the publisher.")
    
    # --- Source & Series Information (Journal, Book, Conference etc.) ---
    source_origin_title: Optional[str] = Field(None, description="Title of the larger work this document is part of. Examples: Journal name (e.g., 'Nature'), Book title (if this is a chapter), Conference proceedings title, Report series title.")
    journal_abbreviation: Optional[str] = Field(None, description="Standard abbreviation for the journal title, if applicable.")
    volume: Optional[str] = Field(None, description="Volume number of the source (e.g., for journals, multi-volume books).")
    issue: Optional[str] = Field(None, description="Issue, number, or part of the source (e.g., for journals).")
    pages: Optional[str] = Field(None, description="Page range within the source (e.g., '123-145', 'vii-ix, 10-25').")
    series_title: Optional[str] = Field(None, description="Title of a series the work belongs to (e.g., a book series).")
    series_number: Optional[str] = Field(None, description="Number or identifier within a series.")
    edition: Optional[str] = Field(None, description="Edition of the work, if specified (e.g., '2nd ed.', 'Revised edition').")

    # --- Identifiers ---
    doi: Optional[str] = Field(None, description="Digital Object Identifier (DOI), e.g., '10.1000/xyz123'.")
    isbn: Optional[str] = Field(None, description="International Standard Book Number (ISBN-13 or ISBN-10).")
    issn: Optional[str] = Field(None, description="International Standard Serial Number (ISSN) for journals or other serial publications.")
    pmid: Optional[str] = Field(None, description="PubMed ID, for biomedical literature.")
    arxiv_id: Optional[str] = Field(None, description="arXiv ID for preprints (e.g., '2304.01234' or 'cs/0102003').")

    # --- Web & Access Information ---
    url: Optional[str] = Field(None, description="A direct, resolvable URL to the document's landing page or full text.")
    access_date: Optional[PublicationDate] = Field(None, description="Date the content was accessed by the user or system, especially for web pages or online resources (year, month, day).")
    archive_name: Optional[str] = Field(None, description="Name of the archive where the document might be stored (e.g., 'Internet Archive', 'PubMed Central').")
    archive_location: Optional[str] = Field(None, description="URL or specific location within an archive.")

    # --- Document Characteristics & Classification ---
    item_type: Optional[ItemTypeEnum] = Field(None,
        description="The document's classified type. The value MUST be one of the string values from the ItemTypeEnum. "
                    "Examples: 'JOURNAL_ARTICLE', 'BOOK', 'WEB_PAGE', 'CONFERENCE_PAPER', 'REPORT', 'THESIS', 'OTHER'. "
                    "The system prompt will contain the full list of valid ItemTypeEnum string values."
    )
    language: Optional[str] = Field(None, description="Primary language of the document, preferably as a 2-letter ISO 639-1 code (e.g., 'en', 'de', 'fr').")
    
    # --- Library & Other Information ---
    call_number: Optional[str] = Field(None, description="Library call number, if applicable (e.g., from a library catalog).")
    library_catalog: Optional[str] = Field(None, description="Name of the library catalog or database where the item was found (e.g., 'Library of Congress', 'WorldCat').")
    license: Optional[str] = Field(None, description="License information or URL under which the document is available (e.g., 'CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/').")
    note: Optional[str] = Field(None, description="General notes or annotations about the reference. Can include information that doesn't fit elsewhere.")

    # --- LLM Control & Feedback ---
    needs_more_context: Optional[bool] = Field(None, description="Set to True if the LLM believes more text from the document is critically needed to extract essential information such as title, authors, publication date, DOI/ISBN (if applicable for the document type), and a clear document_type_guess. Set to False if the current text is sufficient for these core details or if all available text has been processed. Do not set to True solely for missing minor fields if core information is present.")

    # Other potentially useful fields we could add later:
    # edition: Optional[str] = Field(None, description="Edition of the work, if applicable (e.g., for books).")
    # isbn: Optional[str] = Field(None, description="ISBN for books.")
    # issn: Optional[str] = Field(None, description="ISSN for journals or serial publications.") 