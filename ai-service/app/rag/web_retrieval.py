"""Web retrieval for financial concepts from reputable sources."""
from __future__ import annotations

import re
from urllib.parse import urlparse
from typing import Any

import httpx
from duckduckgo_search import DDGS

from app.schemas.sources import RetrievedChunk

# Reputable financial sources (prioritized)
TRUSTED_DOMAINS = {
    "investopedia.com": 0.95,
    "nerdwallet.com": 0.9,
    "bankrate.com": 0.9,
    "consumerfinance.gov": 1.0,  # CFPB
    "sec.gov": 1.0,  # SEC
    "studentaid.gov": 1.0,  # Federal Student Aid
    "irs.gov": 1.0,  # IRS
    "federalreserve.gov": 1.0,
    "investor.gov": 1.0,
    "mint.intuit.com": 0.85,
    "fool.com": 0.8,  # Motley Fool
    "forbes.com/advisor": 0.85,
    "money.usnews.com": 0.8,
    "schwab.com": 0.85,
    "fidelity.com": 0.85,
    "vanguard.com": 0.85,
}

# Max results per search
MAX_SEARCH_RESULTS = 5
MAX_CHUNKS_PER_PAGE = 2

KNOWN_CONCEPT_URLS: dict[str, list[str]] = {
    "lifestyle creep": [
        "https://www.investopedia.com/terms/l/lifestyle-creep.asp",
        "https://www.nerdwallet.com/article/finance/lifestyle-inflation",
    ],
    "emergency fund": [
        "https://www.consumerfinance.gov/about-us/blog/start-small-think-big-when-it-comes-to-saving-for-an-emergency/",
        "https://www.investopedia.com/terms/e/emergency_fund.asp",
    ],
    "credit utilization": [
        "https://www.investopedia.com/terms/c/credit-utilization-rate.asp",
        "https://www.consumerfinance.gov/ask-cfpb/what-is-a-credit-utilization-ratio-en-521/",
    ],
}


def _extract_finance_topic(query: str) -> str:
    q = query.lower()
    topic_map = [
        "lifestyle creep",
        "lifestyle inflation",
        "emergency fund",
        "debt avalanche",
        "debt snowball",
        "credit utilization",
        "compound interest",
        "dollar cost averaging",
        "index fund",
        "etf",
        "budgeting",
    ]
    for topic in topic_map:
        if topic in q:
            return topic
    # fallback: keep it short and finance-specific
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", q)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned[:80]


def _is_trusted_source(url: str) -> tuple[bool, float]:
    """Check if URL is from a trusted financial source."""
    url_lower = url.lower()
    parsed = urlparse(url_lower)
    host = parsed.netloc.replace("www.", "")
    for domain, score in TRUSTED_DOMAINS.items():
        if domain in host or domain in url_lower:
            return True, score
    return False, 0.0


def _clean_text(text: str) -> str:
    """Clean extracted text content."""
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove navigation artifacts
    text = re.sub(r'(Skip to|Jump to|Table of Contents|Advertisement)', '', text, flags=re.IGNORECASE)
    return text.strip()


def _chunk_content(content: str, chunk_size: int = 800, overlap: int = 100) -> list[str]:
    """Split content into overlapping chunks."""
    words = content.split()
    chunks: list[str] = []
    
    for i in range(0, len(words), chunk_size - overlap):
        chunk_words = words[i:i + chunk_size]
        if len(chunk_words) < 50:  # Skip tiny chunks
            continue
        chunks.append(' '.join(chunk_words))
        
        if len(chunks) >= MAX_CHUNKS_PER_PAGE:
            break
    
    return chunks


def _extract_title_from_url(url: str) -> str:
    """Extract a readable title from URL."""
    # Remove protocol and www
    clean = re.sub(r'https?://(www\.)?', '', url)
    # Take domain + first path segment
    parts = clean.split('/')
    if len(parts) > 1:
        title = parts[1].replace('-', ' ').replace('_', ' ').title()
        return title[:80]
    return parts[0]


async def search_web_for_concept(query: str, max_results: int = 3) -> list[RetrievedChunk]:
    """
    Search web for financial concept and return chunks.
    
    Args:
        query: User's question or concept to search
        max_results: Maximum number of web pages to fetch
        
    Returns:
        List of RetrievedChunk objects with web content
    """
    chunks: list[RetrievedChunk] = []
    
    try:
        concept = _extract_finance_topic(query)

        # Query strategy:
        # 1) generic finance query
        # 2) targeted site queries for trusted domains to avoid noisy/irrelevant results
        search_queries = [
            f'"{concept}" personal finance definition',
            f'"{concept}" investing guide',
            f'site:investopedia.com "{concept}"',
            f'site:nerdwallet.com "{concept}"',
            f'site:consumerfinance.gov "{concept}"',
            f'site:investor.gov "{concept}"',
        ]

        results: list[dict[str, Any]] = []
        with DDGS() as ddgs:
            for query_text in search_queries:
                try:
                    partial = list(ddgs.text(query_text, max_results=3))
                    if partial:
                        print(f"[WEB] Query '{query_text}' returned {len(partial)} results")
                        results.extend(partial)
                except Exception as e:
                    print(f"[WEB] Query failed '{query_text}': {e}")
                    continue

        # De-duplicate by URL
        dedup: dict[str, dict[str, Any]] = {}
        for item in results:
            href = item.get("href", "")
            if href and href not in dedup:
                dedup[href] = item
        results = list(dedup.values())

        # Seed with curated URLs for known concepts
        seeded_results: list[dict[str, Any]] = []
        for key, urls in KNOWN_CONCEPT_URLS.items():
            if key in concept:
                for url in urls:
                    seeded_results.append({"href": url, "title": key.title(), "body": ""})
                print(f"[WEB] Added {len(urls)} curated URLs for concept: {key}")
                break

        # Merge seeded + search results, dedupe
        merged_by_url: dict[str, dict[str, Any]] = {}
        for item in seeded_results + results:
            href = item.get("href", "")
            if href and href not in merged_by_url:
                merged_by_url[href] = item
        results = list(merged_by_url.values())
        
        if not results:
            print(f"[WEB] No search results for: {query}")
            return chunks
        
        print(f"[WEB] Found {len(results)} search results")
        
        # Filter for trusted sources
        trusted_results: list[dict[str, Any]] = []
        for result in results:
            url = result.get('href', '')
            is_trusted, trust_score = _is_trusted_source(url)
            
            if is_trusted:
                result['trust_score'] = trust_score
                trusted_results.append(result)
                print(f"[WEB] ✓ Trusted: {url} (score: {trust_score})")
            else:
                print(f"[WEB] ✗ Skipped: {url} (not in trusted list)")
        
        if not trusted_results:
            print(f"[WEB] No trusted sources found for: {query}")
            return chunks
        
        # Sort by trust score
        trusted_results.sort(key=lambda x: x['trust_score'], reverse=True)
        
        # Fetch content from top sources
        async with httpx.AsyncClient(timeout=10.0) as client:
            for idx, result in enumerate(trusted_results[:max_results]):
                url = result.get('href', '')
                title = result.get('title', _extract_title_from_url(url))
                snippet = result.get('body', '')
                trust_score = result['trust_score']
                
                try:
                    # Fetch full page content
                    response = await client.get(url, follow_redirects=True)
                    response.raise_for_status()
                    
                    # Extract main content (simple text extraction)
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(response.text, 'html.parser')
                    
                    # Remove script and style elements
                    for script in soup(["script", "style", "nav", "footer", "header"]):
                        script.decompose()
                    
                    # Get text content
                    text = soup.get_text()
                    text = _clean_text(text)
                    
                    # If content is too short, use snippet
                    if len(text) < 200 and snippet:
                        text = snippet
                    
                    # Chunk the content
                    content_chunks = _chunk_content(text)
                    
                    print(f"[WEB] Fetched {len(content_chunks)} chunks from: {title}")
                    
                    # Convert to RetrievedChunk format
                    for chunk_idx, chunk_text in enumerate(content_chunks):
                        chunks.append(
                            RetrievedChunk(
                                content=chunk_text,
                                source_title=title,
                                source_url=url,
                                relevance_score=trust_score * 0.9,  # Slightly lower than local
                                badge_type="government" if any(d in url for d in ['gov']) else "academic",
                                topic="behavioral",
                            )
                        )

                    # If parsing produced no chunks, still include DDG snippet as fallback
                    if not content_chunks and snippet:
                        chunks.append(
                            RetrievedChunk(
                                content=_clean_text(snippet),
                                source_title=title,
                                source_url=url,
                                relevance_score=trust_score * 0.8,
                                badge_type="government" if any(d in url for d in ['gov']) else "academic",
                                topic="behavioral",
                            )
                        )
                    
                except Exception as e:
                    print(f"[WEB] Failed to fetch {url}: {e}")
                    if snippet:
                        chunks.append(
                            RetrievedChunk(
                                content=_clean_text(snippet),
                                source_title=title,
                                source_url=url,
                                relevance_score=trust_score * 0.75,
                                badge_type="government" if any(d in url for d in ['gov']) else "academic",
                                topic="behavioral",
                            )
                        )
                    continue

        # Last-resort fallback for trusted URLs when extraction/snippet both fail
        if not chunks and trusted_results:
            for result in trusted_results[:max_results]:
                url = result.get('href', '')
                title = result.get('title', _extract_title_from_url(url))
                trust_score = float(result.get('trust_score', 0.6))
                chunks.append(
                    RetrievedChunk(
                        content=(
                            f"Reference source for concept '{concept}'. "
                            f"Page: {title}. URL available for citation."
                        ),
                        source_title=title,
                        source_url=url,
                        relevance_score=trust_score * 0.7,
                        badge_type="government" if any(d in url for d in ['gov']) else "academic",
                        topic="behavioral",
                    )
                )
        
        print(f"[WEB] Retrieved {len(chunks)} total chunks from {len(trusted_results[:max_results])} sources")
        
    except Exception as e:
        print(f"[WEB] Search failed: {e}")
    
    return chunks


def should_use_web_retrieval(question: str) -> bool:
    """Determine if question would benefit from web search."""
    question_lower = question.lower()
    
    # Concept/definition questions
    concept_patterns = [
        r'\bwhat is\b',
        r'\bwhat are\b',
        r'\bwhat does\b',
        r'\bdefine\b',
        r'\bexplain\b',
        r'\bhow does\b',
        r'\bhow do\b',
        r'\btell me about\b',
    ]
    
    for pattern in concept_patterns:
        if re.search(pattern, question_lower):
            return True
    
    # Financial terms that benefit from external sources
    finance_terms = [
        'compound interest', 'index fund', 'etf', 'roth ira', 'traditional ira',
        '401k', 'asset allocation', 'diversification', 'dollar cost averaging',
        'debt avalanche', 'debt snowball', 'credit score', 'debt-to-income',
        'emergency fund', 'net worth', 'capital gains', 'dividend', 
        'expense ratio', 'market cap', 'volatility', 'risk tolerance',
        'lifestyle creep', 'inflation', 'recession', 'bear market', 'bull market',
    ]
    
    for term in finance_terms:
        if term in question_lower:
            return True
    
    return False
