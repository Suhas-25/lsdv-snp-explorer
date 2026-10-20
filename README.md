# LSDV SNP Explorer

Create a clean and modern interactive dashboard for Level 2: Selected SNP Distribution of Lumpy Skin Disease Virus (LSDV).

Data I will provide:

I have three CSV files:

samples_metadata.csv – contains Sample_ID, State, District, Collection_Date, etc.

snp_list.csv – list of SNPs (Position, REF, ALT)

sample_snp_status.csv – shows which samples have which SNP

Dashboard Requirements:

1. SNP Selector

Dropdown to select a SNP (show as: Position REF→ALT)

Example: 12964 G→A

2. India Map Section

Show map of India

Highlight samples from Maharashtra and Odisha

When a SNP is selected, mark the samples that carry it

Use different colours for the two states

3. Sample Table

Show list of samples that have the selected SNP

Columns: Sample ID, State, District, Collection Date, Status

4. Timeline

Show collection dates of the samples that carry the selected SNP

Simple bar or point timeline

5. Summary Cards

Total samples with this SNP

Number of samples in Maharashtra

Number of samples in Odisha

Design:

Clean, professional, scientific look

Green/teal colour theme

Responsive layout

Title: “Level 2 – Selected SNP Distribution | LSDV Genomic Surveillance”

Please generate the full working UI. I will upload the three CSV files. and also i added the one image u can take like reference not fully like that

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5afe5304-8b3a-4197-bbe1-f9b1116d09f3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
