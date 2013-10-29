version = `cat package.json | grep version | awk -F'"' '{print $$4}'`
publish:
	@git tag ${version}
	@git push origin ${version}
	@npm publish

test:
	@echo TRAVIS_JOB_ID $(TRAVIS_JOB_ID)
	@./node_modules/.bin/mocha -t 200000 -R spec

coverage:
	./node_modules/.bin/mocha -t 200000 -R html-cov --require blanket  > coverage.html 
	@open coverage.html

coveralls:
	./node_modules/.bin/mocha -t 200000 -R mocha-lcov-reporter  --require blanket | ./node_modules/.bin/coveralls

.PHONY: test