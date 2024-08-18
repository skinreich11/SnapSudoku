function possible(puzzle,y,x,n) {
    for (let i = 0; i < 9; i++) {
        if (puzzle[y][i] == n) return false;
    }
    for (let j = 0; j < 9; j++) {
        if (puzzle[j][x] == n) return false;
    }
    let y0 = Math.floor(y/3)*3;
    let x0 = Math.floor(x/3)*3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (puzzle[y0 + i][x0 + j] == n) return false;
        }
    }
    return true;
}

function sudoku(puzzle) {
    for (let y = 0; y < 9; y++) {
        for (let x = 0; x < 9; x++) {
            if (puzzle[y][x] == 0) {
                for (let n = 1; n < 10; n++) {
                    if (possible(puzzle,y,x,n)) {
                        puzzle[y][x] = n;
                        if (sudoku(puzzle) == puzzle) {
                            solved = puzzle;
                            return solved;
                        }
                        else {
                            puzzle[y][x] = 0;
                        }
                    }
                }
                return;
            }
        }    
    }
    solved = puzzle;
    return solved;
}
  
function validate(puzzle) {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            n = puzzle[i][j]
            if (n == 0) return false;
            puzzle[i][j] = 0
            if (!possible(puzzle,i,j,n)) {
                puzzle[i][j] = n;
                return false;
            }
            puzzle[i][j] = n;
        }   
    }
    return true
}

