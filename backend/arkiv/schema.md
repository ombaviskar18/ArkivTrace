# Arkiv Entity Schema

This file documents the entity shapes currently written by ArkivTrace backend modules 1-6.
All records share the common `project=arkivtrace` attribute for querying.

## Common conventions

- `entityKey` is the Arkiv 32-byte hex identifier returned by `createEntity` or `getEntityByKey`.
- Queryable attributes are stored in `attributes` using snake_case.
- Full JSON documents are stored in `payload`.
- Dates are ISO 8601 strings.
- The backend avoids automatic retry on writes to prevent duplicate on-chain submissions.

## `shop`

Attributes:

- `project=arkivtrace`
- `type=shop`
- `shop_id`
- `district`
- `state`

Payload fields:

- `shopId`
- `name`
- `operatorName`
- `operatorAddress`
- `district`
- `state`
- `address`
- `allocatedBeneficiaries`
- `monthlyQuotaKg`
- `status`
- `project`
- `entityType=shop`
- `createdAt`

## `dispatch`

Attributes:

- `project=arkivtrace`
- `type=dispatch`
- `dispatch_id`
- `shop_id`
- `grain_type`
- `status=dispatched`

Payload fields:

- `dispatchId`
- `shopId`
- `sourceDepot`
- `grainType`
- `dispatchedQuantityKg`
- `truckNumber`
- `driverName`
- `driverPhone`
- `dispatchDate`
- `expectedDeliveryDate` (optional)
- `remarks`
- `project`
- `entityType=dispatch`
- `shopEntityKey`
- `shopName`
- `status=dispatched`
- `createdAt`

## `receipt`

Attributes:

- `project=arkivtrace`
- `type=receipt`
- `receipt_id`
- `dispatch_id`
- `shop_id`
- `status=confirmed`
- `discrepancy_status` (`none`, `minor`, `major`, `critical`)

Payload fields:

- `receiptId`
- `dispatchId`
- `shopId`
- `receivedQuantityKg`
- `receivedDate`
- `receiverName`
- `remarks`
- `project`
- `entityType=receipt`
- `dispatchEntityKey`
- `dispatchedQuantityKg`
- `discrepancyKg`
- `discrepancyPercent`
- `discrepancyStatus`
- `status=confirmed`
- `createdAt`

## `stock_report`

Attributes:

- `project=arkivtrace`
- `type=stock_report`
- `report_id`
- `shop_id`
- `grain_type`
- `period` in `YYYY-MM`
- `stock_status` (`MATCH`, `MISMATCH`, `INSUFFICIENT_DATA`)

Payload fields:

- `reportId`
- `shopId`
- `grainType`
- `period`
- `openingStockKg`
- `distributedKg`
- `closingStockKg`
- `remarks`
- `project`
- `entityType=stock_report`
- `shopEntityKey`
- `shopName`
- `totalReceivedKg`
- `expectedClosingKg`
- `stockDifferenceKg`
- `stockStatus`
- `distributedExceedsAvailable`
- `receiptDataComplete`
- `receiptCount`
- `receiptEntityKeys`
- `createdAt`

## `discrepancy`

This type is created by receipts, stock reports, and the public discrepancy form.

Attributes for receipt/stock-generated discrepancies:

- `project=arkivtrace`
- `type=discrepancy`
- `discrepancy_id`
- `receipt_id` and/or `dispatch_id` for receipt-derived cases
- `report_id` and `stock_report_entity_key` for stock mismatch cases
- `shop_id`
- `discrepancy_status`
- `resolution_status=open`

Attributes for public reports:

- `project=arkivtrace`
- `type=discrepancy`
- `discrepancy_id`
- `report_id`
- `shop_id`
- `period`
- `discrepancy_status` set to the reported severity
- `resolution_status=open`
- `report_source=public`
- `issue_type`

Payload fields for generated discrepancies:

- `discrepancyId`
- `discrepancyType` (`minor`, `major`, `critical`, `stock_mismatch`)
- `resolutionStatus=open`
- `shopId`
- `period` when available
- `receiptEntityKey` and/or `dispatchEntityKey`
- `stockReportEntityKey` for Module 4 mismatches
- `receiptEntityKeys`
- `project`
- `entityType=discrepancy`
- `createdAt`

Payload fields for public discrepancy reports:

- `discrepancyId`
- `discrepancyType=public_report`
- `resolutionStatus=open`
- `caseStatus=open`
- `reporterScope=public`
- `shopEntityKey`
- `shopName`
- `issueType`
- `severity`
- `description`
- `evidenceEntityKeys`
- `observedDiscrepancyKg` (optional)
- `reporterName`
- `reporterContact`
- `project`
- `entityType=discrepancy`
- `createdAt`

## `audit_event`

Used for discrepancy review history.

Attributes:

- `project=arkivtrace`
- `type=audit_event`
- `audit_id`
- `event_type=discrepancy_review`
- `shop_id`
- `discrepancy_id`
- `previous_case_status`
- `new_case_status`
- `review_decision`
- `reviewer_role`
- `resolution_status`
- `case_status`

Payload fields:

- `auditId`
- `eventType=discrepancy_review`
- `discrepancyId`
- `discrepancyEntityKey`
- `previousCaseStatus`
- `newCaseStatus`
- `reviewDecision`
- `reviewerRole`
- `reviewerName`
- `notes`
- `evidenceEntityKeys`
- `shopId`
- `period`
- `project`
- `entityType=audit_event`
- `createdAt`

## `test_entity`

This is a development/test-only entity type.

Attributes:

- `type=test_entity`
- `category`
- `name`

Payload fields:

- `name`
- `description`
- `category`
- `sampleData`
- `system=ArkivTrace`
- `timestamp`

## Notes

- Public discrepancy reporting is rate limited.
- `POST /api/test/create` is protected in production by admin role checks.
- Arkiv HTTP 429 / `ANON_COST_LIMITED` has been observed during live RPC access; the backend surfaces it as a rate-limited error and does not retry repeatedly.
