# Firestore Indexing Strategy

## Overview

This document outlines the indexing strategy for optimal Firestore performance at scale.

## Required Composite Indexes

### 1. Calendar Notes Collection

```
Collection: users/{uid}/calendar_notes
Fields:
  - createdAt (Descending)
  - items (Array)
Query: WHERE items array-contains ANY + ORDER BY createdAt
```

### 2. Templates Collection

```
Collection: templates
Fields:
  - scope (Ascending)
  - createdAt (Descending)
Query: WHERE scope == 'ifr-scanner' ORDER BY createdAt DESC
```

### 3. Audit Trail Collection

```
Collection: audit_trail
Fields:
  - userId (Ascending)
  - timestamp (Descending)
  - status (Ascending)
Query: WHERE userId == {uid} AND status == 'rejected' ORDER BY timestamp DESC
```

## Single-Field Indexes

### Auto-indexed Fields

- Document ID fields (automatic)
- Fields used in equality queries (automatic)

### Manual Indexes Required

```
Collection: templates
Field: scope
Type: Ascending

Collection: audit_trail
Field: timestamp
Type: Descending

Collection: users/{uid}/calendar_notes
Field: createdAt
Type: Descending
```

## Index Exemptions

### Small Collections (< 1000 docs)

- User profiles (users/{uid}/profile/default)
- User settings
- System configuration

### Write-Heavy Collections

- Real-time logs (use TTL instead)
- Temporary processing data

## Performance Optimization

### Query Patterns

1. Always use indexed fields in WHERE clauses
2. Limit results with `.limit()` for pagination
3. Use cursor-based pagination for large datasets
4. Avoid `!=` and `NOT IN` queries (require full scan)

### Best Practices

- Index fields used in ORDER BY
- Composite indexes for multi-field queries
- Monitor index usage in Firebase Console
- Remove unused indexes monthly

## Deployment

### Firebase CLI

```bash
firebase deploy --only firestore:indexes
```

### firestore.indexes.json

```json
{
  "indexes": [
    {
      "collectionGroup": "calendar_notes",
      "queryScope": "COLLECTION",
      "fields": [{ "fieldPath": "createdAt", "order": "DESCENDING" }]
    },
    {
      "collectionGroup": "templates",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "scope", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Monitoring

### Key Metrics

- Query latency (target: < 100ms)
- Index size (monitor growth)
- Read/write costs
- Failed queries due to missing indexes

### Alerts

- Set up alerts for queries requiring new indexes
- Monitor index build progress
- Track index size growth rate

## Maintenance

### Monthly Tasks

1. Review Firebase Console for index suggestions
2. Remove unused indexes
3. Optimize composite indexes
4. Check query performance metrics

### Quarterly Tasks

1. Audit all collection queries
2. Update index strategy based on usage
3. Review and optimize data model
4. Plan for scaling requirements
