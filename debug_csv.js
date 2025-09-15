const csv = require('csv-parser');
const fs = require('fs');

function debugCSV() {
    console.log('Debugging CSV file structure...');
    
    let rowCount = 0;
    let isHeaderFound = false;
    
    fs.createReadStream('./sample_tickertape.csv')
        .pipe(csv())
        .on('data', (data) => {
            rowCount++;
            console.log(`\nRow ${rowCount}:`);
            console.log('Keys:', Object.keys(data));
            console.log('Fund Name:', data['Fund Name']);
            console.log('First column (empty):', data['']);
            
            if (!isHeaderFound) {
                if (data['Fund Name'] && data['Fund Name'].trim() === 'Fund Name') {
                    isHeaderFound = true;
                    console.log('✅ Found header row!');
                } else {
                    console.log('⏭️  Skipping row (not header)');
                }
            } else {
                console.log('📊 Data row:', {
                    fundName: data['Fund Name'],
                    amcName: data['AMC Name'],
                    units: data['Units'],
                    nav: data['NAV ₹']
                });
            }
            
            if (rowCount >= 10) {
                console.log('\nStopping after 10 rows for debugging...');
                process.exit(0);
            }
        })
        .on('end', () => {
            console.log('\n✅ CSV debugging completed');
        })
        .on('error', (error) => {
            console.error('❌ CSV debugging error:', error);
        });
}

debugCSV();
